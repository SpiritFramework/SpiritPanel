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

function panelHostname(panelUrl: string): string | null {
  try {
    return new URL(panelUrl).hostname;
  } catch {
    return null;
  }
}

/** True when Wings runs on the same host as the panel (nginx /wings/ → 127.0.0.1:8080). */
export function isNodeColocatedWithPanel(node: WingsNodeSocketInput, panelUrl: string): boolean {
  const panelHost = panelHostname(panelUrl);
  if (!panelHost) return false;
  const nodeHost = node.fqdn.split(':')[0].toLowerCase();
  const panel = panelHost.toLowerCase();
  return (
    nodeHost === panel ||
    nodeHost === '127.0.0.1' ||
    nodeHost === 'localhost' ||
    nodeHost === '::1'
  );
}

/**
 * Whether the browser must use the panel nginx /wings/ proxy for this node.
 * Only co-located daemons are safe — remote nodes must not be routed to localhost Wings.
 */
export function shouldUsePanelWebsocketProxy(
  node: WingsNodeSocketInput,
  panelUrl: string,
): boolean {
  if (!panelUrl.startsWith('https://')) return false;
  return isNodeColocatedWithPanel(node, panelUrl);
}

/**
 * Build the browser WebSocket URL for a server console.
 * Throws if an HTTPS panel would need a remote HTTP Wings URL (mixed content / broken proxy).
 */
export function buildWingsWebsocketUrl(serverUuid: string, node: WingsNodeSocketInput): string {
  const cfg = getConfig();
  const panelUrl = cfg.panelUrl || cfg.apiUrl;

  if (shouldUsePanelWebsocketProxy(node, panelUrl)) {
    return panelProxyWebsocketUrl(panelUrl, serverUuid);
  }

  const panelSecure = panelUrl.startsWith('https://');
  if (panelSecure && node.scheme !== 'https') {
    throw new Error(
      `Node "${node.fqdn}" uses HTTP FeatherWings behind an HTTPS panel. Enable HTTPS on that node, or set the node FQDN to the panel hostname if Wings is co-located (nginx /wings/).`,
    );
  }

  const scheme = node.scheme === 'https' ? 'wss' : 'ws';
  return `${scheme}://${node.fqdn}:${node.daemonListen}/api/servers/${serverUuid}/ws`;
}

/** Human-readable hint for admins configuring console access. */
export function describeConsoleAccess(node: WingsNodeSocketInput, panelSecure: boolean): string {
  const panelUrl = getConfig().panelUrl || getConfig().apiUrl;
  if (panelSecure && shouldUsePanelWebsocketProxy(node, panelUrl)) {
    return 'Console proxied through the panel at /wings/ — ensure nginx proxies /wings/ to the local Wings daemon.';
  }
  if (panelSecure && node.scheme !== 'https') {
    return 'HTTPS panel with remote HTTP Wings: enable TLS on the node (do not rely on panel /wings/ — that only reaches localhost).';
  }
  return `Direct connection to ${node.scheme}://${node.fqdn}:${node.daemonListen}.`;
}
