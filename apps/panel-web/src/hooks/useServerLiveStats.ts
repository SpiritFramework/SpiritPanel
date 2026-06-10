import { useServerLiveOptional } from '../context/ServerLiveContext';

export function useServerLiveStats(_serverId: string | undefined) {
  const live = useServerLiveOptional();
  return {
    connected: live?.connectionStatus === 'connected',
    live: live?.connectionStatus === 'connected' ? live.liveStats : null,
    runtimeState: live?.runtimeState ?? null,
  };
}
