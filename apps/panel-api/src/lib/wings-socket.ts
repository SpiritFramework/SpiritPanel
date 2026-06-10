import { getConfig } from './env.js';

type WingsNodeSocketInput = {
  fqdn: string;
  scheme: string;
  daemonListen: number;
  behindProxy: boolean;
};

function panelProxyWebsocketUrl(panelUrl: string, serverUuid: string): string {
  const panelHost = new URL(panelUrl).host;
  return `wss://${panelHost}/wings/api/servers/${serverUuid}/ws`;
}

/** Whether the browser must use the panel nginx /wings/ proxy for this node. */
export function shouldUsePanelWebsocketProxy(
  node: WingsNodeSocketInput,
  panelUrl: string,
): boolean {
  if (!panelUrl.startsWith('https://')) return false;
  if (node.behindProxy) return true;

  // HTTP Wings behind an HTTPS panel cannot be reached directly from the browser.
  if (node.scheme !== 'https') return true;

  // Co-located: node FQDN matches the panel host — Wings is not on nginx :443.
  try {
    const panelHost = new URL(panelUrl).hostname;
    if (node.fqdn === panelHost || node.fqdn === panelHost.split(':')[0]) return true;
  } catch {
    /* ignore */
  }

  return false;
}

/** Build the browser WebSocket URL for a server console. */
export function buildWingsWebsocketUrl(serverUuid: string, node: WingsNodeSocketInput): string {
  const cfg = getConfig();
  const panelUrl = cfg.panelUrl || cfg.apiUrl;

  if (shouldUsePanelWebsocketProxy(node, panelUrl)) {
    return panelProxyWebsocketUrl(panelUrl, serverUuid);
  }

  const scheme = node.scheme === 'https' ? 'wss' : 'ws';
  return `${scheme}://${node.fqdn}:${node.daemonListen}/api/servers/${serverUuid}/ws`;
}

/** Human-readable hint for admins configuring console access. */
export function describeConsoleAccess(node: WingsNodeSocketInput, panelSecure: boolean): string {
  const panelUrl = getConfig().panelUrl || getConfig().apiUrl;
  if (panelSecure && shouldUsePanelWebsocketProxy(node, panelUrl)) {
    return 'Console proxied through the panel at /wings/ — ensure nginx proxies /wings/ to the Wings daemon.';
  }
  if (panelSecure && node.scheme !== 'https') {
    return 'HTTPS panel with HTTP Wings: nginx must proxy /wings/ to the daemon, or enable TLS on Wings.';
  }
  return `Direct connection to ${node.scheme}://${node.fqdn}:${node.daemonListen}.`;
}
