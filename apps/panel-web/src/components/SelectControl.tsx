import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

type ParsedOption = { value: string; label: string; disabled?: boolean };
type ParsedGroup = { label: string; options: ParsedOption[] };
type ParsedItem = ParsedOption | ParsedGroup;

const MENU_GAP = 6;
const MENU_VIEWPORT_PAD = 8;
const MENU_MAX_HEIGHT_PX = 280;

function isGroup(item: ParsedItem): item is ParsedGroup {
  return 'options' in item;
}

function parseSelectChildren(children: ReactNode): ParsedItem[] {
  const items: ParsedItem[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;

    if (child.type === 'option') {
      const el = child as ReactElement<{
        value?: string | number;
        children?: ReactNode;
        disabled?: boolean;
      }>;
      items.push({
        value: String(el.props.value ?? ''),
        label: String(el.props.children ?? ''),
        disabled: el.props.disabled,
      });
      return;
    }

    if (child.type === 'optgroup') {
      const el = child as ReactElement<{ label?: string; children?: ReactNode }>;
      const options: ParsedOption[] = [];
      Children.forEach(el.props.children, (opt) => {
        if (!isValidElement(opt) || opt.type !== 'option') return;
        const o = opt as ReactElement<{
          value?: string | number;
          children?: ReactNode;
          disabled?: boolean;
        }>;
        options.push({
          value: String(o.props.value ?? ''),
          label: String(o.props.children ?? ''),
          disabled: o.props.disabled,
        });
      });
      if (options.length > 0) {
        items.push({ label: String(el.props.label ?? ''), options });
      }
    }
  });

  return items;
}

function flattenOptions(items: ParsedItem[]): ParsedOption[] {
  return items.flatMap((item) => (isGroup(item) ? item.options : [item]));
}

export type SelectControlProps = {
  className?: string;
  children: ReactNode;
  controlSize?: 'sm' | 'md';
  variant?: 'default' | 'filter' | 'hero';
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>;

export function SelectControl({
  children,
  className = '',
  controlSize = 'md',
  variant = 'default',
  value,
  disabled,
  onChange,
  id: idProp,
  name,
  required,
  ...rest
}: SelectControlProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const listId = `${id}-listbox`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef(-1);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const [highlight, setHighlight] = useState(-1);

  const items = useMemo(() => parseSelectChildren(children), [children]);
  const options = useMemo(() => flattenOptions(items), [items]);
  const selectedValue = value == null ? '' : String(value);
  const selected = options.find((opt) => opt.value === selectedValue);
  const enabledOptions = useMemo(() => options.filter((o) => !o.disabled), [options]);

  useEffect(() => {
    highlightRef.current = highlight;
  }, [highlight]);

  function pick(nextValue: string) {
    const opt = options.find((o) => o.value === nextValue);
    if (!opt || opt.disabled) return;
    onChange?.({
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  }

  useEffect(() => {
    if (!open || !wrapRef.current) return;

    function updatePosition() {
      const trigger = wrapRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = Math.min(Math.max(rect.width, 160), vw - MENU_VIEWPORT_PAD * 2);
      const left = Math.min(Math.max(MENU_VIEWPORT_PAD, rect.left), vw - width - MENU_VIEWPORT_PAD);

      const spaceBelow = vh - rect.bottom - MENU_GAP - MENU_VIEWPORT_PAD;
      const spaceAbove = rect.top - MENU_GAP - MENU_VIEWPORT_PAD;
      const preferBelow = spaceBelow >= Math.min(MENU_MAX_HEIGHT_PX, 160) || spaceBelow >= spaceAbove;
      const maxHeight = Math.max(120, Math.min(MENU_MAX_HEIGHT_PX, preferBelow ? spaceBelow : spaceAbove));

      const style: CSSProperties = {
        position: 'fixed',
        left,
        width,
        zIndex: 9999,
        maxHeight,
      };

      if (preferBelow) {
        style.top = rect.bottom + MENU_GAP;
        style.bottom = 'auto';
      } else {
        style.bottom = vh - rect.top + MENU_GAP;
        style.top = 'auto';
      }

      setMenuStyle(style);
    }

    updatePosition();
    const selectedIdx = enabledOptions.findIndex((o) => o.value === selectedValue);
    setHighlight(selectedIdx >= 0 ? selectedIdx : 0);

    const onScrollOrResize = (event: Event) => {
      if (menuRef.current && event.target instanceof Node && menuRef.current.contains(event.target)) {
        return;
      }
      updatePosition();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlight((prev) => {
          if (enabledOptions.length === 0) return -1;
          if (prev < 0) return 0;
          const delta = event.key === 'ArrowDown' ? 1 : -1;
          return (prev + delta + enabledOptions.length) % enabledOptions.length;
        });
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const idx = highlightRef.current;
        const opt = enabledOptions[idx] ?? enabledOptions[0];
        if (opt) {
          onChange?.({
            target: { value: opt.value },
            currentTarget: { value: opt.value },
          } as ChangeEvent<HTMLSelectElement>);
          setOpen(false);
        }
      }
    };

    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointer);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPointer);
    };
  }, [open, enabledOptions, selectedValue, onChange]);

  function renderOption(opt: ParsedOption) {
    const isSelected = opt.value === selectedValue;
    const enabledIdx = enabledOptions.findIndex((o) => o.value === opt.value);
    const isHighlighted = enabledIdx >= 0 && enabledIdx === highlight;
    return (
      <li key={`${opt.value}-${opt.label}`} role="presentation">
        <button
          type="button"
          role="option"
          aria-selected={isSelected}
          disabled={opt.disabled || disabled}
          className={`field-select-menu-item${isSelected ? ' is-selected' : ''}${
            isHighlighted ? ' is-highlighted' : ''
          }`}
          onMouseEnter={() => {
            if (enabledIdx >= 0) setHighlight(enabledIdx);
          }}
          onClick={() => pick(opt.value)}
        >
          <span className="field-select-menu-item-label">{opt.label}</span>
          {isSelected && <Check className="field-select-menu-item-check" aria-hidden />}
        </button>
      </li>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={`field-select-wrap field-select-wrap--${variant} field-select-wrap--${controlSize}${
        open ? ' field-select-wrap--open' : ''
      }`}
    >
      <select
        {...rest}
        id={id}
        name={name}
        required={required}
        value={selectedValue}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        className="field-select-native"
        onChange={onChange}
      >
        {children}
      </select>

      <button
        type="button"
        id={`${id}-trigger`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={`field-select field-select--${variant} field-select--${controlSize} ${className}`}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className={`field-select-value${selected?.label ? '' : ' is-placeholder'}`}>
          {selected?.label || 'Select…'}
        </span>
      </button>

      <span className="field-select-chevron" aria-hidden>
        <ChevronDown className={`field-select-chevron-icon${open ? ' is-open' : ''}`} />
      </span>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className={`field-select-menu field-select-menu--portal field-select-menu--${variant}`}
            style={menuStyle}
            id={listId}
            role="listbox"
            aria-labelledby={`${id}-trigger`}
          >
            <ul className="field-select-menu-list">
              {items.length === 0 ? (
                <li className="field-select-menu-empty" role="presentation">
                  No options
                </li>
              ) : (
                items.map((item, index) =>
                  isGroup(item) ? (
                    <li key={`${item.label}-${index}`} role="presentation" className="field-select-menu-group">
                      <p className="field-select-menu-group-label">{item.label}</p>
                      <ul role="group" aria-label={item.label}>
                        {item.options.map((opt) => renderOption(opt))}
                      </ul>
                    </li>
                  ) : (
                    renderOption(item)
                  ),
                )
              )}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}
