import { Play } from 'lucide-react';

export function StartupPreviewPanel({ resolvedStartup }: { resolvedStartup: string }) {
  return (
    <section className="ds-srv-stu-preview">
      <div className="ds-srv-stu-preview-header">
        <Play className="h-4 w-4" aria-hidden />
        <div>
          <h3 className="ds-srv-stu-preview-title">Resolved command</h3>
          <p className="ds-srv-stu-preview-meta">Preview with current values — actual start may differ after sync</p>
        </div>
      </div>
      <pre className="ds-srv-stu-preview-code">{resolvedStartup || '—'}</pre>
    </section>
  );
}
