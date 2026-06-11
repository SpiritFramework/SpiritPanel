import { useAdminSupport } from '../../context/AdminSupportContext';
import { useServer } from '../../context/ServerContext';
import { useServerLive } from '../../context/ServerLiveContext';
import { ConsoleTerminal } from '../../components/console/ConsoleTerminal';
import { PanelAnnouncementBanner } from '../../components/PanelAnnouncementBanner';
import { ServerPage } from '../../components/server/ServerPage';
import { getServerAccess } from '../../lib/server-access';
import { getConsoleStatusSummary } from '../../lib/server-runtime';
import { CONSOLE_VISIBLE_LINES } from '../../lib/console-buffer';

export function ServerConsolePage() {
  const { server } = useServer();
  const adminSupport = useAdminSupport();
  const access = getServerAccess(server);
  const {
    connectionStatus,
    runtimeState,
    installPhase,
    consoleLines,
    consoleLineCount,
    followScroll,
    setFollowScroll,
    clearConsole,
    downloadConsole,
    sendCommand,
    reconnect,
  } = useServerLive();

  const truncated = consoleLineCount > CONSOLE_VISIBLE_LINES;
  const status = getConsoleStatusSummary(server, connectionStatus, runtimeState);
  const installing =
    installPhase === 'installing' ||
    server.installStatus === 'installing' ||
    server.status === 'installing';

  const subtitle = adminSupport
    ? `${adminSupport.owner.username} · ${adminSupport.serverName}`
    : installing
      ? 'Installation in progress'
      : truncated
        ? `Last ${CONSOLE_VISIBLE_LINES} lines · download for full log`
        : 'Live output · history restored on reconnect';

  const emptyMessage =
    connectionStatus === 'connecting'
      ? 'Connecting to the daemon and loading recent logs…'
      : installing
        ? 'Install script output will appear here as it runs.'
        : 'Start the server or run a command to see output here.';

  return (
    <ServerPage fullHeight className="gap-3">
      <PanelAnnouncementBanner location="console" />
      <ConsoleTerminal
        serverName={server.name}
        subtitle={subtitle}
        status={status}
        connectionStatus={connectionStatus}
        consoleLines={consoleLines}
        consoleLineCount={consoleLineCount}
        truncated={truncated}
        installing={installing}
        canCommand={access.canConsole}
        followScroll={followScroll}
        onFollowScrollChange={setFollowScroll}
        onReconnect={reconnect}
        onClear={clearConsole}
        downloadLog={downloadConsole}
        sendCommand={sendCommand}
        emptyMessage={emptyMessage}
      />
    </ServerPage>
  );
}
