/** How to deliver a console command to FeatherWings without double-execution. */
export type ConsoleCommandTransport = 'websocket' | 'http';

export function resolveConsoleCommandTransport(wsReadyState: number | undefined): ConsoleCommandTransport {
  if (wsReadyState === WebSocket.OPEN) return 'websocket';
  return 'http';
}
