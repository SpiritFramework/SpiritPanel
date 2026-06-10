import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Egg,
  HardDrive,
  LayoutDashboard,
  MapPin,
  Search,
  Server,
  Settings,
  Terminal,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, type ServerSummary } from '../lib/api';
import { getServerTheme } from '../lib/server-theme';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Server;
  to: string;
  keywords?: string;
  group: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [servers, setServers] = useState<ServerSummary[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.rootAdmin;

  // Global hotkey (only when authenticated).
  useEffect(() => {
    if (!user) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-command-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-palette', onOpen);
    };
  }, [user]);

  // Load servers once when first opened.
  useEffect(() => {
    if (open && servers.length === 0) {
      api.client.servers().then(setServers).catch(() => {});
    }
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open, servers.length]);

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [
      { id: 'servers', label: 'My servers', icon: Server, to: '/servers', group: 'Navigate' },
      { id: 'profile', label: 'Profile', icon: User, to: '/profile', group: 'Navigate' },
    ];
    if (isAdmin) {
      list.push(
        { id: 'admin', label: 'Admin dashboard', icon: LayoutDashboard, to: '/admin', group: 'Admin' },
        { id: 'admin-users', label: 'Users', icon: Users, to: '/admin/users', group: 'Admin' },
        { id: 'admin-servers', label: 'Servers', icon: Server, to: '/admin/servers', group: 'Admin' },
        { id: 'admin-nodes', label: 'Nodes', icon: HardDrive, to: '/admin/nodes', group: 'Admin' },
        { id: 'admin-locations', label: 'Locations', icon: MapPin, to: '/admin/locations', group: 'Admin' },
        { id: 'admin-nests', label: 'Nests & Eggs', icon: Egg, to: '/admin/nests', group: 'Admin' },
        { id: 'admin-activity', label: 'Activity', icon: Activity, to: '/admin/activity', group: 'Admin' },
        { id: 'admin-settings', label: 'Settings', icon: Settings, to: '/admin/settings', group: 'Admin' },
      );
    }
    for (const s of servers) {
      list.push({
        id: `server-${s.id}`,
        label: s.name,
        hint: s.egg.name,
        icon: Terminal,
        to: `/servers/${s.id}/console`,
        keywords: `${s.egg.name} ${s.node.name}`,
        group: 'Servers',
      });
    }
    return list;
  }, [isAdmin, servers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || (c.keywords ?? '').toLowerCase().includes(q) || (c.hint ?? '').toLowerCase().includes(q),
    );
  }, [commands, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    filtered.forEach((c) => {
      const arr = map.get(c.group) ?? [];
      arr.push(c);
      map.set(c.group, arr);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const go = useCallback(
    (cmd: Command) => {
      setOpen(false);
      navigate(cmd.to);
    },
    [navigate],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && filtered[active]) {
      e.preventDefault();
      go(filtered[active]);
    }
  };

  if (!open || !user) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[12vh]">
      <button
        type="button"
        className="modal-overlay-enter absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-label="Close command palette"
      />
      <div className="modal-panel-enter relative w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
        <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search servers and pages…"
            className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
          />
          <kbd className="hidden rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted)] sm:block">
            ESC
          </kbd>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-[var(--muted)]">No results found.</p>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="mb-1">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">{group}</p>
                {items.map((cmd) => {
                  flatIndex += 1;
                  const idx = flatIndex;
                  const Icon = cmd.icon;
                  const isActive = idx === active;
                  const theme = group === 'Servers' ? getServerTheme(cmd.hint ?? '') : null;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => go(cmd)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                        isActive ? 'bg-[var(--accent-muted)]' : 'hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--muted)]"
                        style={theme ? { background: theme.gradient } : { background: 'var(--bg-elevated)' }}
                      >
                        <Icon className={`h-3.5 w-3.5 ${theme ? 'text-white/90' : ''}`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm ${isActive ? 'text-[var(--accent-hover)]' : 'text-[var(--text)]'}`}>
                          {cmd.label}
                        </span>
                        {cmd.hint && <span className="block truncate text-[11px] text-[var(--muted)]">{cmd.hint}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
