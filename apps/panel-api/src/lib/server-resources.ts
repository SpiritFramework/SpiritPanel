/** Server build resources (memory, disk, cpu, swap, io): 0 means unlimited. */
export function isUnlimitedServerResource(value: number): boolean {
  return value <= 0;
}

/** Memory/disk that counts against node capacity totals. */
export function serverResourceContribution(value: number): number {
  return isUnlimitedServerResource(value) ? 0 : value;
}

export function formatServerResourceLabel(value: number, unit: string): string {
  if (isUnlimitedServerResource(value)) return 'Unlimited';
  if (value >= 1024 && unit === 'MiB') {
    return `${(value / 1024).toFixed(value % 1024 === 0 ? 0 : 1)} GiB`;
  }
  return `${value} ${unit}`;
}

export function formatServerCpuLabel(value: number): string {
  return isUnlimitedServerResource(value) ? 'Unlimited' : `${value}%`;
}
