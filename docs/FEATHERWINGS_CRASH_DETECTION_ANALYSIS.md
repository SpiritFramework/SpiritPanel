# FeatherWings Crash Detection & Status Reporting Analysis

> **Status: reference snapshot, not a maintained guide.** Written August 2026 against **FeatherWings 1.3.7.4**. The tree vendored in this repo is now **1.3.7.10**, so the `FeatherWings-1.3.7.4/...` paths below no longer resolve — the equivalent files sit under `FeatherWings-1.3.7.10/FeatherWings-1.3.7.10/` (the directory is nested twice) at the same relative paths. Line references may have shifted; search by function name rather than jumping to a line.

## Overview
FeatherWings (the panel daemon) has a comprehensive crash detection system that monitors Docker container states, detects crashes, reports them to the panel API, and automatically restarts servers with safety mechanisms to prevent boot loops.

---

## Key Files & Components

### 1. **Crash Detection Handler** - `server/crash.go`
**Location:** `FeatherWings-1.3.7.4/server/crash.go`

**Function:** `handleServerCrash()` - Primary crash detection logic

**Responsibilities:**
- Checks if crash detection is enabled globally for the server
- Retrieves container exit state and exit code
- Handles OOM (Out of Memory) kill detection
- Implements crash frequency throttling to prevent boot loops
- Logs crash events with exit code and OOM status
- Auto-restarts the server if criteria are met

**Key Logic:**
```go
func (s *Server) handleServerCrash() error {
    // 1. Verify server is offline and crash detection enabled
    if s.Environment.State() != environment.ProcessOfflineState || 
       !s.Config().CrashDetectionEnabled {
        return nil
    }
    
    // 2. Get exit code and OOM status from container
    exitCode, oomKilled, err := s.Environment.ExitState()
    
    // 3. Handle clean exits (exit code 0)
    if exitCode == 0 && !oomKilled && 
       !config.Get().System.CrashDetection.DetectCleanExitAsCrash {
        // Ignore clean exits if configured
        return nil
    }
    
    // 4. Check crash frequency (prevent boot loops)
    lastCrash := s.crasher.LastCrashTime()
    timeout := config.Get().System.CrashDetection.Timeout
    
    if timeout != 0 && !lastCrash.IsZero() && 
       lastCrash.Add(time.Second * time.Duration(timeout)).After(time.Now()) {
        return &crashTooFrequent{}  // Too soon - don't restart
    }
    
    // 5. Log crash activity with metadata
    s.SaveActivity(s.NewRequestActivity("", "127.0.0.1"), 
        ActivityServerCrashed, 
        models.ActivityMeta{
            "exit_code": exitCode,
            "oomkilled": oomKilled,
            "logs": logs,  // Last log lines
        })
    
    // 6. Update last crash time and restart
    s.crasher.SetLastCrash(time.Now())
    return s.HandlePowerAction(PowerActionStart)  // Restart
}
```

**Crash Detection Configuration:**
- `CrashDetectionEnabled` - Global enable/disable
- `DetectCleanExitAsCrash` - Treat exit code 0 as crash if unexpected
- `Timeout` - Seconds between crashes before blocking auto-restart
- `CrashActivityLogLines` - Number of console lines to log on crash

---

### 2. **State Change Handler** - `server/server.go`
**Location:** `FeatherWings-1.3.7.4/server/server.go` (lines 370-425)

**Function:** `OnStateChange()` - Handles all state transitions

**Responsibilities:**
- Monitors state transitions (Offline → Running → Starting, etc.)
- Detects crash scenarios (Running/Starting → Offline)
- Triggers crash handler in separate goroutine (non-blocking)
- **Communicates crash status to Panel API** via `PushServerStateChange()`
- Updates internal state tracking
- Publishes events to listeners

**Key Logic:**
```go
func (s *Server) OnStateChange() {
    prevState := s.resources.State.Load()
    st := s.Environment.State()
    
    // 1. Update tracked state
    s.resources.State.Store(st)
    
    // 2. Emit state change event
    if prevState != st {
        s.Events().Publish(StatusEvent, st)
    }
    
    // 3. Reset resources when process stops
    if st == environment.ProcessOfflineState {
        s.resources.Reset()
        s.Events().Publish(StatsEvent, s.Proc())
    }
    
    // 4. **DETECT CRASH: Running/Starting → Offline**
    if (prevState == environment.ProcessStartingState || 
        prevState == environment.ProcessRunningState) && 
       st == environment.ProcessOfflineState {
        
        s.Log().Info("detected server as entering a crashed state; running crash handler")
        
        // Run crash handler asynchronously (non-blocking)
        go func(server *Server) {
            if err := server.handleServerCrash(); err != nil {
                if IsTooFrequentCrashError(err) {
                    server.Log().Info("did not restart server after crash; occurred too soon")
                } else {
                    s.PublishConsoleOutputFromDaemon("Server crash detected but error during handling")
                    server.Log().WithField("error", err).Error("failed to handle server crash")
                }
            }
        }(s)
    }
    
    // 5. **PUSH STATUS TO PANEL API**
    sc := remote.ServerStateChange{PrevState: prevState, NewState: st}
    s.Log().WithField("state_change", sc).Debug("pushing server status change to panel")
    err := s.client.PushServerStateChange(context.Background(), s.ID(), sc)
    if err != nil {
        s.Log().WithField("error", err).Error("error pushing server status change to panel")
    }
}
```

**State Values:**
- `"offline"` - Container not running
- `"starting"` - Container running, waiting for startup done line
- `"running"` - Server process ready and online
- `"stopping"` - Container stopping (prevents premature crash detection)

---

### 3. **Panel API Communication** - `remote/servers.go`
**Location:** `FeatherWings-1.3.7.4/remote/servers.go` (lines 224-231)

**Function:** `PushServerStateChange()` - Reports status to Panel

**Data Structure:**
```go
type ServerStateChange struct {
    PrevState string `json:"previous_state"`
    NewState  string `json:"new_state"`
}
```

**Implementation:**
```go
func (c *client) PushServerStateChange(ctx context.Context, sid string, 
    sc ServerStateChange) error {
    
    // POST to: /servers/{serverId}/container/status
    resp, err := c.Post(ctx, fmt.Sprintf("/servers/%s/container/status", sid), 
        d{"data": sc})
    if err != nil {
        return errors.WithStackIf(err)
    }
    _ = resp.Body.Close()
    return nil
}
```

**Panel API Endpoint:**
- **POST** `/servers/{serverId}/container/status`
- **Payload:** `{"data": {"previous_state": "...", "new_state": "..."}}`
- Sent on every state transition, including crash detection

---

### 4. **Container State Monitoring** - `environment/docker/`

#### Exit State Detection - `environment/docker/environment.go`
**Function:** `ExitState()` (lines 147-166)

```go
func (e *Environment) ExitState() (uint32, bool, error) {
    c, err := e.ContainerInspect(context.Background())
    if err != nil {
        if client.IsErrNotFound(err) {
            return 1, false, nil  // Container deleted
        }
        return 0, false, errors.WrapIf(err, "environment/docker: failed to inspect container")
    }
    
    // Return: exit code, OOM killed flag
    return uint32(c.State.ExitCode), c.State.OOMKilled, nil
}
```

**Returns:**
1. Exit code (uint32) - Process exit code
2. OOM Killed (bool) - Whether killed by OOM
3. Error - If container inspection failed

#### Container Wait Logic - `environment/docker/power.go` (lines 286-310)

**Function:** `WaitStop()` - Waits for container to stop

```go
// Block until container marked as not running
ok, errChan := e.client.ContainerWait(tctx, e.Id, 
    container.WaitConditionNotRunning)

select {
case <-ctx.Done():
    if terminate {
        return doTermination("parent-context")
    }
    return err

case err := <-errChan:
    if err == nil || client.IsErrNotFound(err) {
        return nil
    }
    if terminate {
        // If timeout, force terminate with SIGKILL
        return doTermination("wait")
    }
    return errors.WrapIf(err, "environment/docker: error waiting on container stop")

case <-ok:
    // Container stopped successfully
}
```

#### Container State Polling - `environment/docker/power.go` (lines 327-380)

**Function:** `Terminate()` - Forcefully stops container with polling

Polls container state every 500ms with 10-second timeout:
- Sends initial signal (SIGTERM)
- Polls `container.State.Running` property
- On timeout, sends SIGKILL
- Updates environment state transitions:
  - Sets to `ProcessStoppingState` first (prevents premature crash detection)
  - Then to `ProcessOfflineState` after container stops

---

### 5. **Activity Logging** - `server/activity.go`

**Event Type:**
```go
const ActivityServerCrashed = models.Event("server:crashed")
```

**Logging Function:**
```go
func (s *Server) SaveActivity(a RequestActivity, event models.Event, 
    metadata models.ActivityMeta) {
    
    ctx, cancel := context.WithTimeout(s.Context(), time.Second*3)
    go func() {
        defer cancel()
        // Saves to database with metadata
        if tx := database.Instance().WithContext(ctx).Create(
            a.Event(event, metadata)); tx.Error != nil {
            
            s.Log().WithField("error", errors.WithStack(tx.Error)).
                WithField("event", event).
                Error("activity: failed to save event")
        }
    }()
}
```

**Crash Activity Metadata Recorded:**
- `exit_code` - Process exit code
- `oomkilled` - Whether OOM killer terminated it
- `logs` - Last N console lines before crash

---

### 6. **Event Listeners** - `server/listeners.go`

**Location:** `FeatherWings-1.3.7.4/server/listeners.go` (lines 60-150)

**Function:** `StartEventListeners()` - Registers environment event handlers

**Events Monitored:**
1. **StateChangeEvent** - Container state changes
   - Triggers `OnStateChange()` which handles crash detection & panel notification
   - Resets throttler on `ProcessStartingState`

2. **ResourceEvent** - CPU/Memory stats
   - Updates resource tracking
   - Publishes stats event

3. **DockerImagePullStatus** - Image pull progress
   - Forwards to install output

```go
case environment.StateChangeEvent:
    // Reset throttler when process starts
    if e.Data == environment.ProcessStartingState {
        limit.Reset()
        s.Throttler().Reset()
    }
    s.OnStateChange()  // ← Main crash detection trigger
```

---

### 7. **Error Handling** - `server/errors.go`

**Crash Frequency Error:**
```go
type crashTooFrequent struct{}

func (e *crashTooFrequent) Error() string {
    return "server has crashed too soon after the last detected crash"
}

func IsTooFrequentCrashError(err error) bool {
    _, ok := err.(*crashTooFrequent)
    return ok
}
```

Prevents boot loops by rejecting restarts within the configured timeout window.

---

## Complete Crash Detection Flow

### Sequence of Events:

```
1. Container Process Exits
   ↓
2. Docker detects container stop
   ↓
3. Environment monitoring (Attach loop) detects stream close
   ↓
4. Environment.SetState(ProcessOfflineState)
   ↓
5. StateChangeEvent published to event bus
   ↓
6. server.StartEventListeners() receives event
   ↓
7. OnStateChange() called
   ↓
8. Crash detection logic:
   - If prevState was Running/Starting AND newState is Offline → CRASH DETECTED
   ↓
9. Spawn goroutine → handleServerCrash()
   ├─ Get exit code & OOM status from container
   ├─ Check if clean exit should be ignored
   ├─ Check crash frequency (prevent boot loops)
   ├─ Save crash activity to database
   └─ Auto-restart server (PowerActionStart)
   ↓
10. **PushServerStateChange() to Panel API**
    └─ POST /servers/{id}/container/status
       with {previous_state: "running", new_state: "offline"}
```

### Crash Prevention Mechanisms:

1. **Frequency Throttling** - Don't restart if crashed within timeout window
2. **Clean Exit Handling** - Can ignore exit code 0 if configured
3. **OOM Detection** - Detects memory limit violations
4. **State Validation** - Only treat Running/Starting → Offline as crash
5. **Blocking State** - ProcessStoppingState prevents crash detection during controlled shutdown

---

## Key Configuration Settings

**In config.yaml:**
```yaml
crash_detection:
  enabled: true
  detect_clean_exit_as_crash: true
  timeout: 60  # seconds between crashes before blocking restart

crash_detection_activity_lines: 2  # lines to log on crash
```

---

## Summary of Information Flow

| Component | Purpose | Direction |
|-----------|---------|-----------|
| **Docker API** | Container state changes | → Wings |
| **Environment Events** | State change notifications | Environment → Server |
| **handleServerCrash()** | Crash detection & auto-restart | Server → Docker API |
| **SaveActivity()** | Log crash to database | Server → Database |
| **PushServerStateChange()** | Notify panel of status change | **Wings → Panel API** |
| **Console Output** | Display crash detection messages | → Client WebSocket |

---

## Files Summary

| File | Purpose | Key Functions |
|------|---------|----------------|
| `server/crash.go` | Crash detection logic | `handleServerCrash()` |
| `server/server.go` | State transition handling & panel communication | `OnStateChange()` |
| `server/listeners.go` | Environment event monitoring | `StartEventListeners()` |
| `server/activity.go` | Activity logging | `SaveActivity()` |
| `remote/servers.go` | Panel API client | `PushServerStateChange()` |
| `environment/docker/environment.go` | Docker container state queries | `ExitState()`, `State()` |
| `environment/docker/power.go` | Container lifecycle management | `WaitStop()`, `Terminate()` |
| `environment/docker/container.go` | Container operations | `Attach()`, `SetState()` |
| `config/config.go` | Configuration structures | `CrashDetection` struct |

---

## Panel Integration Points

**When Wings Detects a Crash:**

1. Publishes console message: "---------- Detected server process in a crashed state! ----------"
2. Logs crash details (exit code, OOM status) to database
3. **Sends state change notification** to panel: `POST /servers/{id}/container/status`
4. Attempts auto-restart (if not in cooldown period)

**Panel Can:**
- See crash events in server activity log
- Monitor state changes in real-time via webhook/status endpoint
- Configure crash detection behavior via server settings
- Track crash history and frequency

