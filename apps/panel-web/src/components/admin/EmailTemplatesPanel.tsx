import { useEffect, useMemo, useState } from 'react';
import { Eye, Mail } from 'lucide-react';
import { api } from '../../lib/api';
import {
  EMAIL_TEMPLATE_META,
  type EmailTemplate,
  type EmailTemplateId,
  type EmailTemplatesSettings,
} from '../../lib/email-templates';
import { Input, Textarea } from '../Layout';
import { Checkbox } from '../Checkbox';

export function EmailTemplatesPanel({
  templates,
  onChange,
}: {
  templates: EmailTemplatesSettings;
  onChange: (next: EmailTemplatesSettings) => void;
}) {
  const [activeId, setActiveId] = useState<EmailTemplateId>('password_reset');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const active = templates[activeId];
  const meta = useMemo(() => EMAIL_TEMPLATE_META.find((m) => m.id === activeId)!, [activeId]);
  const activeJson = useMemo(() => JSON.stringify(active), [active]);

  function patchActive(patch: Partial<EmailTemplate>) {
    onChange({ ...templates, [activeId]: { ...active, ...patch } });
  }

  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError('');
    api.admin
      .previewEmailTemplate(activeId, active)
      .then((res) => {
        if (!cancelled) setPreviewHtml(res.html);
      })
      .catch((err) => {
        if (!cancelled) {
          setPreviewHtml('');
          setPreviewError(err instanceof Error ? err.message : 'Preview failed');
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId, activeJson, active]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {EMAIL_TEMPLATE_META.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveId(item.id)}
            className={`rounded-lg border px-3 py-2 text-left transition ${
              activeId === item.id
                ? 'border-[color-mix(in_srgb,var(--accent)_50%,var(--border))] bg-[var(--accent-muted)]'
                : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))]'
            }`}
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <Mail className="h-3.5 w-3.5" />
              {item.label}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div>
            <p className="text-sm font-semibold">{meta.label}</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{meta.description}</p>
          </div>

          <Checkbox
            label="Enable this template"
            description="When off, this email will not be sent"
            checked={active.enabled}
            onChange={(enabled) => patchActive({ enabled })}
          />

          <Input label="Subject" value={active.subject} onChange={(e) => patchActive({ subject: e.target.value })} />
          <Input label="Heading" value={active.heading} onChange={(e) => patchActive({ heading: e.target.value })} />
          <Input
            label="Button label"
            value={active.buttonLabel ?? ''}
            onChange={(e) => patchActive({ buttonLabel: e.target.value })}
            placeholder="Optional — leave empty to hide button"
          />
          <Textarea
            label="Body HTML"
            value={active.bodyHtml}
            onChange={(e) => patchActive({ bodyHtml: e.target.value })}
            rows={8}
            className="font-mono text-xs"
          />

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Placeholders</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {meta.placeholders.map((ph) => (
                <code
                  key={ph}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]"
                >
                  {`{{${ph}}}`}
                </code>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              <Eye className="h-3.5 w-3.5" />
              Live preview
            </p>
            {previewLoading && <span className="text-[10px] text-[var(--muted)]">Updating…</span>}
          </div>
          {previewError ? (
            <p className="p-4 text-xs text-[var(--danger-fg)]">{previewError}</p>
          ) : (
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={previewHtml}
              className="h-[420px] w-full border-0 bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
}
