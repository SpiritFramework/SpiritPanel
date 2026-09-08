import { Info } from 'lucide-react';
import type { ScheduleFormSeed } from '../../CreateScheduleModal';
import { QUICK_TEMPLATES } from '../../../lib/schedule-utils';

export function SchedulesInfoBanner() {
  return (
    <div className="ds-srv-sch-info">
      <Info className="h-4 w-4 shrink-0" aria-hidden />
      <p>
        Schedules run on the panel in <strong>UTC</strong>. Use them for off-peak restarts, automated backups, or
        console commands — active schedules fire on their cron timer, or use <strong>Run now</strong> to test
        immediately.
      </p>
    </div>
  );
}

export function SchedulesTemplatesRow({ onSelect }: { onSelect: (seed: ScheduleFormSeed) => void }) {
  return (
    <section className="ds-srv-sch-templates">
      <p className="ds-srv-sch-templates-label">Quick start</p>
      <div className="ds-srv-sch-templates-grid">
        {QUICK_TEMPLATES.map((template) => (
          <button key={template.label} type="button" className="ds-srv-sch-template-card" onClick={() => onSelect(template.seed)}>
            <span className="ds-srv-sch-template-card-label">{template.label}</span>
            <span className="ds-srv-sch-template-card-hint">{template.hint}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
