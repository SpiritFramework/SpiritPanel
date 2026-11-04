import type { ScheduleFormSeed } from '../../CreateScheduleModal';
import { ClientCallout } from '../../client/primitives';
import { QUICK_TEMPLATES } from '../../../lib/schedule-utils';

export function SchedulesInfoBanner() {
  return (
    <ClientCallout
      tone="info"
      title="Schedules run in UTC"
      description={
        <>
          Use them for off-peak restarts, automated backups, or console commands — active schedules fire on their cron
          timer, or use <strong>Run now</strong> to test immediately.
        </>
      }
    />
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
