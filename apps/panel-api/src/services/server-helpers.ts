import type { Prisma } from '@prisma/client';
import { getConfig } from '../lib/env.js';

const serverInclude = {
  egg: { include: { variables: true, nest: true } },
  node: true,
  defaultAllocation: true,
  extraAllocations: true,
  variables: { include: { eggVariable: true } },
} satisfies Prisma.ServerInclude;

export { serverInclude };

export async function getServerFull(prisma: import('@prisma/client').PrismaClient, uuid: string) {
  return prisma.server.findUnique({
    where: { uuid },
    include: serverInclude,
  });
}

export async function getServerFullById(prisma: import('@prisma/client').PrismaClient, id: string) {
  return prisma.server.findUnique({
    where: { id },
    include: serverInclude,
  });
}

export async function getNodeServers(prisma: import('@prisma/client').PrismaClient, nodeId: string) {
  return prisma.server.findMany({
    where: { nodeId },
    include: serverInclude,
  });
}

export function buildWingsConfig(node: {
  uuid: string;
  name: string;
  fqdn: string;
  scheme: string;
  behindProxy: boolean;
  daemonListen: number;
  daemonSftp: number;
  daemonBase: string;
  daemonTokenId: string;
  daemonTokenSecret: string;
  uploadSize: number;
}) {
  const panelUrl = getConfig().panelUrl || getConfig().apiUrl;

  // Wings serves TLS itself only when the node uses HTTPS and is NOT behind a
  // proxy. When behind a proxy (nginx/Cloudflare), SSL is terminated there and
  // Wings listens on plain HTTP.
  const wingsServesTls = node.scheme === 'https' && !node.behindProxy;
  const sslBlock = wingsServesTls
    ? `  ssl:
    enabled: true
    cert: /etc/letsencrypt/live/${node.fqdn}/fullchain.pem
    key: /etc/letsencrypt/live/${node.fqdn}/privkey.pem`
    : `  ssl:
    enabled: false`;

  const localhostWarning = /localhost|127\.0\.0\.1/.test(panelUrl)
    ? `# WARNING: remote points at ${panelUrl}. Set PANEL_URL in the panel .env to the
# public panel URL (e.g. https://panel.example.com) or Wings cannot reach the panel.
`
    : '';

  const proxyNote = node.behindProxy
    ? `# This node is "Behind proxy": terminate SSL at nginx/Cloudflare and forward to
# http://127.0.0.1:${node.daemonListen}. Wings skips its own certificate checks.
`
    : wingsServesTls
      ? `# This node uses SSL directly. A valid certificate for ${node.fqdn} must exist at
# the cert/key paths below (e.g. via: certbot certonly --standalone -d ${node.fqdn}).
`
      : `# This node uses a plain HTTP connection. Browsers on an HTTPS panel cannot open
# the console directly — enable SSL or "Behind proxy" for production.
`;

  return `# Spirit-Panel / FeatherWings configuration for ${node.name}
${localhostWarning}${proxyNote}debug: false
uuid: ${node.uuid}
token_id: ${node.daemonTokenId}
token: ${node.daemonTokenSecret}
api:
  host: 0.0.0.0
  port: ${node.daemonListen}
${sslBlock}
  upload_limit: ${node.uploadSize}
system:
  data: ${node.daemonBase}
  sftp:
    bind_port: ${node.daemonSftp}
remote: ${panelUrl}
remote_query:
  timeout: 30
  boot_servers_per_page: 50
allowed_origins:
  - ${panelUrl}
allowed_mounts: []
allow_cors_private_network: false
`;
}
