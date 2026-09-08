import { useAdminSupport } from '../../context/AdminSupportContext';
import { useServer } from '../../context/ServerContext';
import { useServerLive } from '../../context/ServerLiveContext';
import { ConsoleTerminal } from '../../components/console/ConsoleTerminal';
import { PanelAnnouncementBanner } from '../../components/PanelAnnouncementBanner';
import { ServerPage } from '../../components/server/ServerPage';
import { getServerAccess } from '../../lib/server-access';
import { getConsoleStatusSummary } from '../../lib/server-runtime';

export function ServerConsolePage() {
  const { server } = useServer();
  const adminSupport = useAdminSupport();
  const access = getServerAccess(server);
  const {
    connectionStatus,
    runtimeState,
    installPhase,
    consoleLines,
    liveStats,
    followScroll,
    setFollowScroll,
    clearConsole,
    downloadConsole,
    sendCommand,
    reconnect,
  } = useServerLive();

  const status = getConsoleStatusSummary(server, connectionStatus, runtimeState);
  const installing =
    installPhase === 'installing' ||
    server.installStatus === 'installing' ||
    server.status === 'installing';

  const subtitle = adminSupport
    ? `${adminSupport.owner.username} · ${adminSupport.serverName}`
    : installing
      ? 'Installation in progress'
      : undefined;

  const emptyMessage =
    connectionStatus === 'connecting'
      ? 'Connecting to the daemon and loading recent logs…'
      : installing
        ? 'Install script output will appear here as it runs.'
        : status.label.toLowerCase().includes('offline') || status.tone === 'muted'
          ? 'Start the server from the sidebar to stream live console output and usage.'
          : 'Start the server or run a command to see output here.';

  return (
    <ServerPage fullHeight className="gap-0 md:gap-3">
      <div className="hidden md:block">
        <PanelAnnouncementBanner location="console" compact />
      </div>
      <ConsoleTerminal
        serverName={server.name}
        eggName={server.egg.name}
        eggLogoUrl={server.egg.logoUrl}
        subtitle={subtitle}
        status={status}
        connectionStatus={connectionStatus}
        consoleLines={consoleLines}
        installing={installing}
        canCommand={access.canConsole}
        followScroll={followScroll}
        onFollowScrollChange={setFollowScroll}
        onReconnect={reconnect}
        onClear={clearConsole}
        downloadLog={downloadConsole}
        sendCommand={sendCommand}
        emptyMessage={emptyMessage}
        liveStats={liveStats}
        limits={{ memory: server.memory, disk: server.disk, cpu: server.cpu }}
      />
    </ServerPage>
  );
}
