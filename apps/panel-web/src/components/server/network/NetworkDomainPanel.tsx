import { Globe, Server, Trash2 } from 'lucide-react';
import { Button, Input } from '../../Layout';
import type { ServerDomainResponse } from '../../../lib/api';
import type { getServerAccess } from '../../../lib/server-access';

export function NetworkDomainPanel({
  domainInfo,
  slugDraft,
  previewFqdn,
  baseDomain,
  working,
  access,
  onSlugChange,
  onSave,
  onPrefer,
  onDelete,
}: {
  domainInfo: ServerDomainResponse;
  slugDraft: string;
  previewFqdn: string;
  baseDomain: string;
  working: string | null;
  access: ReturnType<typeof getServerAccess>;
  onSlugChange: (value: string) => void;
  onSave: () => void;
  onPrefer: (preferSubdomain: boolean) => void;
  onDelete: () => void;
}) {
  if (!domainInfo.feature.enabled || !domainInfo.feature.canManage) {
    return (
      <section className="ds-srv-net-domain">
        <div className="ds-srv-net-domain-header">
          <Globe className="h-4 w-4" aria-hidden />
          <div>
            <h3 className="ds-srv-net-domain-title">Subdomain</h3>
            <p className="ds-srv-net-domain-meta">Optional DNS name for this server</p>
          </div>
        </div>
        <div className="ds-srv-net-domain-body">
          <p className="ds-srv-net-domain-notice">
            {domainInfo.feature.reason || 'Subdomains are not available on this node yet.'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="ds-srv-net-domain">
      <div className="ds-srv-net-domain-header">
        <Globe className="h-4 w-4" aria-hidden />
        <div>
          <h3 className="ds-srv-net-domain-title">Subdomain</h3>
          <p className="ds-srv-net-domain-meta">Optional DNS name for this server</p>
        </div>
      </div>

      <div className="ds-srv-net-domain-body">
        <div className="ds-srv-net-domain-form">
          <div className="min-w-0 flex-1">
            <Input
              label="Subdomain slug"
              value={slugDraft}
              onChange={(e) => onSlugChange(e.target.value)}
              placeholder="myserver"
              disabled={!access.canUpdateAllocations}
              hint={
                previewFqdn
                  ? `Resolves as ${previewFqdn}`
                  : baseDomain
                    ? `Creates slug.${baseDomain}`
                    : undefined
              }
            />
          </div>
          {access.canUpdateAllocations ? (
            <Button
              type="button"
              disabled={working === 'domain' || !slugDraft.trim()}
              onClick={onSave}
            >
              {working === 'domain'
                ? 'Saving…'
                : domainInfo.domain
                  ? 'Update subdomain'
                  : 'Create subdomain'}
            </Button>
          ) : null}
        </div>

        {domainInfo.domain ? (
          <>
            <dl className="ds-srv-net-domain-details">
              <div className="ds-srv-net-domain-detail">
                <dt>
                  <Server className="h-3.5 w-3.5" aria-hidden />
                  IP
                </dt>
                <dd>{domainInfo.ipAddress}</dd>
              </div>
              <div className="ds-srv-net-domain-detail">
                <dt>
                  <Globe className="h-3.5 w-3.5" aria-hidden />
                  Hostname
                </dt>
                <dd>
                  <span className="ds-srv-net-domain-hostname">{domainInfo.subdomainAddress ?? '—'}</span>
                  <span className="ds-srv-net-domain-hostname-hint">
                    {domainInfo.domain.hostnameOnly
                      ? 'Minecraft SRV active — hostname only'
                      : domainInfo.feature.hostnameOnlySupported
                        ? 'Re-save to create Minecraft SRV'
                        : 'This game needs hostname:port'}
                  </span>
                </dd>
              </div>
            </dl>

            {access.canUpdateAllocations ? (
              <div className="ds-srv-net-domain-actions">
                <span className="ds-srv-net-domain-actions-label">Show players:</span>
                <Button
                  type="button"
                  size="sm"
                  variant={!domainInfo.preferSubdomain ? 'primary' : 'secondary'}
                  disabled={working === 'prefer'}
                  onClick={() => onPrefer(false)}
                >
                  Use IP
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={domainInfo.preferSubdomain ? 'primary' : 'secondary'}
                  disabled={working === 'prefer'}
                  onClick={() => onPrefer(true)}
                >
                  Use subdomain
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={working === 'domain-delete'}
                  onClick={onDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
