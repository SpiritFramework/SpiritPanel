import { AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react';
import type { PanelAnnouncementSettings } from '../../../lib/panel-settings';

export const TITLE_MAX = 120;
export const MESSAGE_MAX = 1000;

export const TONE_OPTIONS: Array<{
  value: PanelAnnouncementSettings['tone'];
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { value: 'info', label: 'Info', description: 'General notice', icon: Info },
  { value: 'warning', label: 'Warning', description: 'Maintenance or issues', icon: AlertTriangle },
  { value: 'success', label: 'Success', description: 'Good news or completed work', icon: CheckCircle2 },
];
