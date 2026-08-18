# Panel API Container State Handling Analysis

## Overview
Complete analysis of how the Spirit Panel API receives, tracks, and handles container state updates from FeatherWings.

---

## 1. PRIMARY ENDPOINT: POST /servers/{uuid}/container/status

**File:** [apps/panel-api/src/routes/remote.ts](apps/panel-api/src/routes/remote.ts#L208)

### Endpoint Handler (Lines 208-225)
```typescript
app.post('/servers/:uuid/container/status', async (request, reply) => {
  const { uuid } = request.params as { uuid: string };
  const server = await prisma.server.findUnique({ where: { uuid } });
  if (!server || server.nodeId !== request.node!.id) {
    return reply.status(404).send({ error: 'Server not found' });
  }

  const state = parseContainerStatusBody(request.body);
  if (!state) {
    return reply.status(400).send({ error: 'Missing or invalid state field' });
  }

  await applyContainerStatusUpdate(prisma, server, state);

  return {
    message: 'Server status updated successfully',
    state,
    server_uuid: server.uuid,
  };
});
```

### Request Body Format
The endpoint expects one of these two formats:
1. **FeatherWings format (nested):** `{ data: { new_state: 'running' } }`
2. **FeatherPanel spec format (top-level fallback):** `{ state: 'starting' }`

---

## 2. STATE VALIDATION AND PARSING

**File:** [apps/panel-api/src/lib/container-state.ts](apps/panel-api/src/lib/container-state.ts#L1)

### Valid Container States (Lines 3-14)
```typescript
export const CONTAINER_STATES = new Set([
  'offline',      // Server is not running
  'starting',     // Server is starting up
  'running',      // Server is running normally
  'stopping',     // Server is stopping
  'stopped',      // Server has stopped
  'installing',   // Installation script is running
  'install_failed',   // Installation failed
  'update_failed',    // Update failed
  'backup_failed',    // Backup failed
  'crashed',          // Server crashed
  'suspended',        // Server is suspended
]);
```

### State Normalization Function (Lines 19-21)
```typescript
export function normalizeContainerState(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, '_');
}
```
- Converts to lowercase
- Replaces whitespace with underscores
- Example: `"Install Failed"` → `"install_failed"`

### Body Parsing Function (Lines 23-37)
```typescript
export function parseContainerStatusBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const nested = record.data as Record<string, unknown> | undefined;

  const raw =
    (typeof nested?.new_state === 'string' ? nested.new_state : null) ??
    (typeof record.state === 'string' ? record.state : null);

  if (!raw?.trim()) return null;

  const normalized = normalizeContainerState(raw.trim());
  return CONTAINER_STATES.has(normalized) ? normalized : null;
}
```

**Logic:**
1. Priority: `data.new_state` → fallback to `state` field
2. Normalizes the raw value
3. Validates against CONTAINER_STATES set
4. Returns normalized state or `null` if invalid

---

## 3. STATE PERSISTENCE AND TRANSITION LOGIC

**File:** [apps/panel-api/src/lib/container-state.ts](apps/panel-api/src/lib/container-state.ts#L61)

### Primary State Update Function (Lines 61-92)
```typescript
export async function applyContainerStatusUpdate(
  prisma: PrismaClient,
  server: { id: string; uuid: string },
  state: string,
) {
  setContainerStatus(server.uuid, state);  // Cache for 1 hour

  const data: {
    containerState: string;
    status?: 'installing' | 'install_failed' | 'normal';
    installStatus?: 'installing' | 'failed' | 'installed';
    suspended?: boolean;
  } = { containerState: state };

  // STATE TRANSITION LOGIC
  if (state === 'installing') {
    data.status = 'installing';
    data.installStatus = 'installing';
  } else if (state === 'install_failed') {
    data.status = 'install_failed';
    data.installStatus = 'failed';
  } else if (state === 'running' || state === 'starting') {
    data.status = 'normal';
    data.installStatus = 'installed';
  } else if (state === 'stopping' || state === 'stopped' || state === 'offline') {
    data.status = 'normal';
  } else if (state === 'suspended') {
    data.suspended = true;
  }

  await prisma.server.update({ where: { id: server.id }, data });
}
```

### State Transition Mapping Table
| Container State | Panel Status | Install Status | Suspended |
|---|---|---|---|
| `offline` | `normal` | *(unchanged)* | *(unchanged)* |
| `starting` | `normal` | `installed` | *(unchanged)* |
| `running` | `normal` | `installed` | *(unchanged)* |
| `stopping` | `normal` | *(unchanged)* | *(unchanged)* |
| `stopped` | `normal` | *(unchanged)* | *(unchanged)* |
| `installing` | `installing` | `installing` | *(unchanged)* |
| `install_failed` | `install_failed` | `failed` | *(unchanged)* |
| `update_failed` | *(unchanged)* | *(unchanged)* | *(unchanged)* |
| `backup_failed` | *(unchanged)* | *(unchanged)* | *(unchanged)* |
| `crashed` | *(unchanged)* | *(unchanged)* | *(unchanged)* |
| `suspended` | *(unchanged)* | *(unchanged)* | `true` |

### In-Memory Cache (Lines 17-21)
```typescript
const statusCache = new Map<string, { state: string; expiresAt: number }>();
const TTL_MS = 60 * 60 * 1000;  // 1 hour TTL

export function getContainerStatus(uuid: string): string | null { ... }
export function setContainerStatus(uuid: string, state: string) { ... }
```

---

## 4. LIVE STATE RESOLUTION (Polling from FeatherWings)

**File:** [apps/panel-api/src/services/server-runtime-status.ts](apps/panel-api/src/services/server-runtime-status.ts)

### Resolution Priority Chain (Lines 24-69)
```typescript
// Resolution priority: Cached → Polled from Wings → DB-persisted
export async function resolveServerContainerState(
  server: ServerRuntimeRecord,
  opts?: { refresh?: boolean },
): Promise<string | null> {
  const cached = getContainerStatus(server.uuid);
  if (cached && !opts?.refresh) return cached;

  const fromWings = await fetchLiveContainerState(server.node, server.uuid);
  const resolved = fromWings ?? cached ?? server.containerState;

  if (fromWings) {
    persistContainerStateIfChanged(server, fromWings).catch(() => {});
  }

  return resolved;
}
```

**Resolution Order:**
1. **In-memory cache** (1-hour TTL) - fastest
2. **Live poll from FeatherWings** - authoritative
3. **Database-persisted value** - fallback if Wings is unreachable

### State Inference from Wings Resources (Lines 74-113)

**File:** [apps/panel-api/src/lib/wings-resources.ts](apps/panel-api/src/lib/wings-resources.ts#L74)

```typescript
export function inferStateFromWingsResources(raw: unknown): string {
  const resources = parseWingsResourcesPayload(raw);
  const explicit = normalizeWingsState(resources.state);
  const active = statsIndicateRunning(resources);

  // Stale nested "starting" while the container is clearly up → running
  if (explicit === 'starting' && active) return 'running';
  if (explicit) return explicit;
  if (active) return 'running';
  return 'offline';
}

function statsIndicateRunning(resources: WingsResourcesSnapshot): boolean {
  return (
    (resources.uptime ?? 0) > 0 ||
    (resources.memory_bytes ?? 0) > 512_000 ||
    (resources.cpu_absolute ?? 0) > 0.05
  );
}
```

**Inference Logic:**
1. If Wings reports explicit state (`'starting'`, `'running'`, etc.) → use it
2. BUT if state is `'starting'` AND resource stats show active usage → upgrade to `'running'`
3. If no explicit state but stats show activity → infer `'running'`
4. Otherwise → `'offline'`

---

## 5. API RESPONSES WITH RECONCILED STATE

**File:** [apps/panel-api/src/routes/client.ts](apps/panel-api/src/routes/client.ts#L95)

### Live State Enrichment Example (Lines 95-115)
```typescript
const enriched = await enrichServerRefsWithLiveState(
  all.map((server) => ({
    id: server.id,
    uuid: server.uuid,
    nodeId: server.nodeId,
    containerState: server.containerState,
  })),
  { refresh: true },  // Poll all servers from Wings
);

const stateById = new Map(enriched.map((row) => [row.id, row.containerState]));

return all.map(({ memory, disk, cpu, uuid, containerState, status, installStatus, ...rest }) => {
  const liveState = stateById.get(rest.id) ?? containerState;
  const reconciled = reconcilePanelFieldsForContainerState(liveState ?? 'offline');
  return {
    ...rest,
    uuid,
    memory,
    disk,
    cpu,
    containerState: liveState,
    status: reconciled.status ?? status,
    installStatus: reconciled.installStatus ?? installStatus,
  };
});
```

### Panel Field Reconciliation (Lines 94-106 in container-state.ts)
```typescript
export function reconcilePanelFieldsForContainerState(
  containerState: string,
): Partial<{ status: string; installStatus: string }> {
  if (containerState === 'running' || containerState === 'starting') {
    return { status: 'normal', installStatus: 'installed' };
  }
  if (containerState === 'installing') {
    return { status: 'installing', installStatus: 'installing' };
  }
  if (containerState === 'install_failed') {
    return { status: 'install_failed', installStatus: 'failed' };
  }
  return {};
}
```

---

## 6. STATE SENT TO FEATHERWINGS (Configuration Sync)

**File:** [apps/panel-api/src/services/server-lifecycle.ts](apps/panel-api/src/services/server-lifecycle.ts#L202)

### Configuration Sync Endpoint
```typescript
export async function syncServerToWings(uuid: string) {
  const server = await getServerFull(prisma, uuid);
  if (!server) throw new Error('Server not found');
  await ensureServerOnWings(uuid);
  const wings = wingsForNode(server.node);
  await wings.syncServer(uuid);  // POST /api/servers/{uuid}/sync
}
```

### What Gets Sent (Lines 1-150+ in server-configuration.ts)
Configuration sent via `POST /api/servers/{uuid}/sync`:
- Server UUID, name, description
- Memory, CPU, disk, swap, IO limits
- Docker image, startup command
- Environment variables
- Allocations (IP/port mappings)
- Egg configuration
- File parsers, stop signal, etc.

**IMPORTANT:** `containerState` is **NOT** sent to Wings. Only configuration data. State flows FROM Wings TO Panel, never the reverse.

---

## 7. INSTALLATION COMPLETION CALLBACK

**File:** [apps/panel-api/src/routes/remote.ts](apps/panel-api/src/routes/remote.ts#L143)

### POST /servers/{uuid}/install Handler (Lines 143-189)
```typescript
app.post('/servers/:uuid/install', async (request, reply) => {
  const { uuid } = request.params as { uuid: string };
  const body = request.body as { successful?: boolean; reinstall?: boolean };
  const server = await prisma.server.findUnique({ where: { uuid } });
  
  if (!server || server.nodeId !== request.node!.id) {
    return reply.status(404).send({ error: 'Server not found' });
  }

  await prisma.server.update({
    where: { id: server.id },
    data: {
      installStatus: body.successful ? 'installed' : 'failed',
      status: body.successful ? 'normal' : 'install_failed',
      containerState: body.successful ? 'offline' : 'install_failed',
      installedAt: body.successful ? new Date() : null,
    },
  });

  // ... email notifications ...
});
```

---

## 8. DATABASE SCHEMA

**File:** [apps/panel-api/prisma/schema.prisma](apps/panel-api/prisma/schema.prisma#L202)

```prisma
enum ServerStatus {
  installing
  install_failed
  suspended
  restoring_backup
  normal
}

enum InstallStatus {
  none
  installing
  installed
  failed
}

model Server {
  // ...
  status           ServerStatus   @default(normal)
  containerState   String         @default("offline") @map("container_state")
  installStatus    InstallStatus  @default(none) @map("install_status")
  // ...
}
```

**Key Observations:**
- `status` is an enum (limited values)
- `containerState` is a String (can be any value, but should match CONTAINER_STATES set)
- `installStatus` is an enum (limited values)

---

## 9. POTENTIAL BUGS IDENTIFIED

### ⚠️ No Direct Validation on Database

**Issue:** The `containerState` field is a String in the database, not an enum. While the API validates incoming state values via `parseContainerStatusBody()`, there's nothing preventing:
1. Direct database updates with invalid states
2. Corrupted data from other sources
3. Stale states from old migrations

**Recommendation:** Either:
- Change `containerState` to a database enum type
- Add a constraint/trigger at the database level
- Add defensive validation when reading from DB

### ⚠️ State Inference Can Upgrade "starting" → "running"

**Location:** [apps/panel-api/src/lib/wings-resources.ts](apps/panel-api/src/lib/wings-resources.ts#L89)

```typescript
if (explicit === 'starting' && active) return 'running';
```

This is actually a **feature**, not a bug—it prevents showing stale "starting" state when the container is already actively running. However, it does mean the state returned from Wings might be transformed.

### ⚠️ Silent Fallbacks in State Resolution

**Location:** [apps/panel-api/src/services/server-runtime-status.ts](apps/panel-api/src/services/server-runtime-status.ts#L59)

```typescript
const resolved = fromWings ?? cached ?? server.containerState;
```

If Wings is unreachable, it silently falls back to cache or DB without logging. This could mask ongoing node connectivity issues.

### ⚠️ Cache TTL is Long (1 hour)

**Location:** [apps/panel-api/src/lib/container-state.ts](apps/panel-api/src/lib/container-state.ts#L18)

```typescript
const TTL_MS = 60 * 60 * 1000;  // 1 hour
```

If Wings reports a state but later the container crashes, it could take up to 1 hour for the panel to notice (without explicit refresh).

**Workaround:** Use `{ refresh: true }` in API calls to always poll Wings.

### ✅ Missing States Handled Gracefully

If a containerState like `'update_failed'`, `'backup_failed'`, or `'crashed'` is received, it's validated and stored but doesn't trigger any panel status/installStatus updates. This is intentional—only certain states drive UI/workflow changes.

---

## 10. DATA FLOW DIAGRAM

```
FeatherWings                    Panel API                       Database
────────────                    ─────────                       ────────

Server runs, state changes
        │
        ├─ POST /api/remote/servers/{uuid}/container/status
        │                               │
        │                        parseContainerStatusBody()
        │                           (validate state)
        │                               │
        │                        applyContainerStatusUpdate()
        │                               ├─→ setContainerStatus() [cache 1h]
        │                               └─→ Update server record
        │                                   ├─ containerState = state
        │                                   ├─ status = mapped value
        │                                   ├─ installStatus = mapped
        │                                   └─ suspended = if suspended
        │                                       │
        │                                       └─→ MySQL: servers table


Panel Client                    Panel API                       FeatherWings
────────────                    ─────────                       ────────

GET /servers
        │
        ├─→ enrichServerRefsWithLiveState(refresh: true)
        │       │
        │       ├─→ resolveServerContainerState()
        │       │       ├─→ Check cache [getContainerStatus()]
        │       │       ├─→ Poll Wings [fetchLiveContainerState()]
        │       │       │       └─→ GET /api/servers/{uuid}
        │       │       │           GET /api/resources/{uuid} (legacy)
        │       │       │               inferStateFromWingsResources()
        │       │       └─→ Fall back to DB [server.containerState]
        │       │
        │       └─→ persistContainerStateIfChanged() (if new from Wings)
        │
        ├─→ reconcilePanelFieldsForContainerState()
        │
        └─→ Response with live state + reconciled status/installStatus
```

---

## 11. TEST COVERAGE

**File:** [apps/panel-api/src/remote-api.test.ts](apps/panel-api/src/remote-api.test.ts#L50)

```typescript
describe('container status parsing', () => {
  it('accepts nested new_state from FeatherWings', () => {
    assert.equal(parseContainerStatusBody({ data: { new_state: 'running' } }), 'running');
  });

  it('accepts top-level state fallback from FeatherPanel spec', () => {
    assert.equal(parseContainerStatusBody({ state: 'starting' }), 'starting');
  });

  it('rejects invalid states', () => {
    assert.equal(parseContainerStatusBody({ state: 'unknown' }), null);
    assert.equal(parseContainerStatusBody({}), null);
  });
});
```

---

## 12. RELATED FILES

| File | Purpose |
|------|---------|
| [apps/panel-api/src/routes/remote.ts](apps/panel-api/src/routes/remote.ts) | Remote API endpoints (Wings ↔ Panel) |
| [apps/panel-api/src/routes/client.ts](apps/panel-api/src/routes/client.ts) | Client API endpoints (Web UI ↔ Panel) |
| [apps/panel-api/src/lib/container-state.ts](apps/panel-api/src/lib/container-state.ts) | State validation and caching |
| [apps/panel-api/src/services/server-runtime-status.ts](apps/panel-api/src/services/server-runtime-status.ts) | Live state polling and enrichment |
| [apps/panel-api/src/lib/wings-resources.ts](apps/panel-api/src/lib/wings-resources.ts) | State inference from Wings API responses |
| [apps/panel-api/src/services/server-configuration.ts](apps/panel-api/src/services/server-configuration.ts) | Config sent TO Wings (no state) |
| [apps/panel-api/src/services/server-lifecycle.ts](apps/panel-api/src/services/server-lifecycle.ts) | Server lifecycle operations |
| [apps/panel-api/src/services/wings-client.ts](apps/panel-api/src/services/wings-client.ts) | HTTP client for Wings API |

---

## Summary

✅ **State Reception:** Wings sends container state via `POST /api/remote/servers/{uuid}/container/status`

✅ **Validation:** States are validated against 11 valid values before persistence

✅ **Persistence:** States update `containerState` field + drive derived `status`/`installStatus`

✅ **Caching:** 1-hour in-memory cache to reduce polling load

✅ **Resolution:** Always prefers live Wings data over cache/DB

✅ **Direction:** State flows FROM Wings TO Panel ONLY (panel never sends state back)

⚠️ **Database:** `containerState` is String, not enum—vulnerable to corruption

⚠️ **Inferred State:** "starting" auto-upgraded to "running" based on resource stats

⚠️ **Cache TTL:** 1 hour could mask recent crashes without explicit refresh
