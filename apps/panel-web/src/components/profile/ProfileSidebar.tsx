import { Check, Copy, Fingerprint } from 'lucide-react';
import { NodeOverviewSection } from '../admin/node-detail/NodeDetailShell';
import { ProfileAvatarPreview } from '../ProfileAvatarField';
import { RoleBadge, AccountStatus } from '../UserCard';

export function ProfileSidebar({
  avatarUrl,
  username,
  uuid,
  joined,
  role,
  rootAdmin,
  suspended,
  copied,
  onCopyUuid,
}: {
  avatarUrl?: string | null;
  username: string;
  uuid: string;
  joined: string;
  role: string;
  rootAdmin: boolean;
  suspended: boolean;
  copied: boolean;
  onCopyUuid: () => void;
}) {
  return (
    <aside className="ds-prof-rail">
      <NodeOverviewSection icon={Fingerprint} title="Account card" description="Your public identity">
        <div className="ds-prof-rail-card">
          <ProfileAvatarPreview avatarUrl={avatarUrl} username={username} />
          <div className="ds-prof-rail-badges">
            <RoleBadge role={role} rootAdmin={rootAdmin} />
            <AccountStatus suspended={suspended} />
          </div>
          <dl className="ds-prof-rail-meta">
            <div className="ds-prof-rail-row">
              <dt>Member since</dt>
              <dd>{joined}</dd>
            </div>
          </dl>
        </div>
      </NodeOverviewSection>

      <NodeOverviewSection icon={Copy} title="Account ID" description="Unique identifier for support">
        <div className="ds-prof-uuid">
          <Fingerprint className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          <code className="min-w-0 truncate">{uuid}</code>
        </div>
        <button type="button" className="ds-btn ds-btn--secondary ds-btn--sm mt-2" onClick={onCopyUuid}>
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          {copied ? 'Copied' : 'Copy UUID'}
        </button>
      </NodeOverviewSection>
    </aside>
  );
}
