import { Check, Pipette, Shuffle } from 'lucide-react';
import { ACCENT_PALETTE_PRESETS, contrastRatio } from '../lib/branding-theme-palettes';
import { ColorField } from './BrandingFields';

function isValidHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function BrandingColorPanel({
  accentColor,
  secondaryColor,
  onAccentChange,
  onSecondaryChange,
  onApplyPair,
}: {
  accentColor: string;
  secondaryColor: string;
  onAccentChange: (value: string) => void;
  onSecondaryChange: (value: string) => void;
  onApplyPair: (primary: string, secondary: string) => void;
}) {
  const gradient = `linear-gradient(135deg, ${isValidHex(accentColor) ? accentColor : '#6366f1'}, ${isValidHex(secondaryColor) ? secondaryColor : accentColor})`;
  const contrast = isValidHex(accentColor) ? contrastRatio(accentColor, '#ffffff') : 0;
  const contrastLabel =
    contrast >= 4.5 ? 'Good contrast on buttons' : contrast >= 3 ? 'Acceptable contrast' : 'Low contrast — may be hard to read';

  function randomize() {
    const pick = ACCENT_PALETTE_PRESETS[Math.floor(Math.random() * ACCENT_PALETTE_PRESETS.length)]!;
    onApplyPair(pick.primary, pick.secondary);
  }

  const activePaletteId =
    ACCENT_PALETTE_PRESETS.find((p) => p.primary.toLowerCase() === accentColor.toLowerCase() && p.secondary.toLowerCase() === secondaryColor.toLowerCase())?.id ?? null;

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <div className="relative h-20" style={{ background: gradient }}>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(0,0,0,0.45))]" />
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/70">Live gradient</p>
              <p className="text-xs font-semibold text-white">Primary → Secondary</p>
            </div>
            <div className="flex gap-1.5">
              <span className="rounded-md px-2 py-1 text-[10px] font-semibold text-white shadow-sm" style={{ background: accentColor }}>
                Button
              </span>
              <span className="rounded-md border border-white/25 bg-white/10 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                Link
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-[var(--border)] bg-[var(--surface-muted)]">
          <div className="border-r border-[var(--border)] px-3 py-2">
            <p className="text-[10px] text-[var(--muted)]">Primary</p>
            <p className="font-mono text-xs font-medium">{accentColor || '—'}</p>
          </div>
          <div className="px-3 py-2">
            <p className="text-[10px] text-[var(--muted)]">Secondary</p>
            <p className="font-mono text-xs font-medium">{secondaryColor || '—'}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--muted)]">
          <Pipette className="mr-1 inline h-3.5 w-3.5" />
          {contrastLabel}
          {isValidHex(accentColor) && (
            <span className="ml-1 tabular-nums opacity-70">({contrast.toFixed(1)}:1)</span>
          )}
        </p>
        <button
          type="button"
          onClick={randomize}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--muted)] transition hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] hover:text-[var(--text)]"
        >
          <Shuffle className="h-3.5 w-3.5" />
          Random palette
        </button>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-[var(--text)]">Curated palettes</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ACCENT_PALETTE_PRESETS.map((palette) => {
            const active = activePaletteId === palette.id;
            return (
              <button
                key={palette.id}
                type="button"
                onClick={() => onApplyPair(palette.primary, palette.secondary)}
                className={`group relative overflow-hidden rounded-xl border text-left transition ${
                  active
                    ? 'border-[color-mix(in_srgb,var(--accent)_50%,var(--border))] ring-2 ring-[var(--accent-muted)]'
                    : 'border-[var(--border)] hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))]'
                }`}
              >
                <div className="flex h-10">
                  <span className="flex-1" style={{ background: palette.primary }} />
                  <span className="flex-1" style={{ background: palette.secondary }} />
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5">
                  <span className="text-[11px] font-medium">{palette.label}</span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0 accent-text" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ColorField label="Primary accent" value={accentColor} onChange={onAccentChange} hint="Buttons, links, and highlights" />
        <ColorField label="Secondary accent" value={secondaryColor} onChange={onSecondaryChange} hint="Gradients, glows, and login sidebar" />
      </div>
    </div>
  );
}
