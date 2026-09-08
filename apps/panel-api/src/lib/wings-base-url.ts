import type { Node } from '@prisma/client';
import { getConfig } from './env.js';
import { isNodeColocatedWithPanel } from './wings-socket.js';

type WingsNode = Pick<Node, 'fqdn' | 'scheme' | 'daemonListen' | 'behindProxy' | 'publicIp'>;

/**
 * Scheme FeatherWings listens on for API traffic from the panel.
 * Behind nginx: plain HTTP. Direct TLS node: HTTPS on the daemon port.
 */
export function wingsDaemonScheme(node: Pick<Node, 'scheme' | 'behindProxy'>): 'http' | 'https' {
  if (node.behindProxy) return 'http';
  return node.scheme === 'https' ? 'https' : 'http';
}

export function localWingsBaseUrl(node: Pick<Node, 'daemonListen' | 'scheme' | 'behindProxy'>): string {
  return `${wingsDaemonScheme(node)}://127.0.0.1:${node.daemonListen}`;
}

/** Base URL candidates for panel-api → FeatherWings HTTP calls (tried in order). */
export function resolveWingsConnectBases(node: WingsNode): string[] {
  const override = process.env.WINGS_CONNECT_URL?.trim();
  if (override) return [override.replace(/\/$/, '')];

  const panelUrl = getConfig().panelUrl || getConfig().apiUrl;
  const bases = new Set<string>();

  bases.add(resolveWingsBaseUrl(node));
  bases.add(localWingsBaseUrl(node));

  if (isNodeColocatedWithPanel(node, panelUrl) && panelUrl.startsWith('https://')) {
    bases.add(`${panelUrl.replace(/\/$/, '')}/wings`);
  }

  const publicIp = node.publicIp?.trim();
  if (publicIp) {
    bases.add(`${wingsDaemonScheme(node)}://${publicIp}:${node.daemonListen}`);
  }

  return [...bases];
}

/** Primary base URL for panel-api → FeatherWings API calls (not browser console URLs). */
export function resolveWingsBaseUrl(node: Pick<Node, 'fqdn' | 'scheme' | 'daemonListen' | 'behindProxy'>): string {
  const panelUrl = getConfig().panelUrl || getConfig().apiUrl;

  if (isNodeColocatedWithPanel(node, panelUrl)) {
    return localWingsBaseUrl(node);
  }

  const scheme = wingsDaemonScheme(node);
  return `${scheme}://${node.fqdn}:${node.daemonListen}`;
}
