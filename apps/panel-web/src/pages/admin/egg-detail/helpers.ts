import type { AdminEggDetail, UpdateAdminEggInput } from '../../../lib/api';

export const EGG_GRADIENT =
  'linear-gradient(135deg, #78350f 0%, #d97706 45%, #451a03 100%)';

export type EggDetailTab = 'overview' | 'manage' | 'variables' | 'config';

export function readEggDetailTab(value: string | null): EggDetailTab {
  if (value === 'manage' || value === 'variables' || value === 'config') return value;
  return 'overview';
}

export function formFromEggDetail(detail: AdminEggDetail): UpdateAdminEggInput {
  return {
    name: detail.name,
    description: detail.description,
    enabled: detail.enabled,
    logoUrl: detail.logoUrl ?? '',
  };
}

export function eggFormHasChanges(
  detail: AdminEggDetail,
  form: UpdateAdminEggInput,
): boolean {
  return (
    form.name !== detail.name ||
    (form.description ?? '') !== detail.description ||
    (form.enabled ?? true) !== detail.enabled ||
    (form.logoUrl ?? '') !== (detail.logoUrl ?? '')
  );
}
