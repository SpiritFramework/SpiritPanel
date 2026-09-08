import type { AdminNestDetail, UpdateAdminNestInput } from '../../../lib/api';

export const NEST_GRADIENT =
  'linear-gradient(135deg, #4c1d95 0%, #7c3aed 45%, #2e1065 100%)';

export type NestDetailTab = 'overview' | 'manage' | 'eggs';

export function readNestDetailTab(value: string | null): NestDetailTab {
  if (value === 'manage' || value === 'eggs') return value;
  return 'overview';
}

export function formFromNestDetail(detail: AdminNestDetail): UpdateAdminNestInput {
  return {
    name: detail.name,
    description: detail.description,
    author: detail.author,
  };
}

export function nestFormHasChanges(
  detail: AdminNestDetail,
  form: UpdateAdminNestInput,
): boolean {
  return (
    form.name !== detail.name ||
    (form.description ?? '') !== detail.description ||
    (form.author ?? '') !== detail.author
  );
}
