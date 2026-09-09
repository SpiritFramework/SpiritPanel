import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Braces,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Database,
  Eye,
  Lock,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Terminal,
  Upload,
  X,
} from 'lucide-react';
import {
  api,
  type DatabaseManagerMeta,
  type DatabaseManagerQueryResponse,
  type DatabaseManagerScriptResponse,
  type DatabaseManagerTableResponse,
  type DatabaseManagerTableSummary,
  type ServerDatabaseSummary,
} from '../../../lib/api';
import { ConfirmModal } from '../../ConfirmModal';
import { Spinner } from '../../ui';
import { DatabaseRowEditor, rowPrimaryKey } from './DatabaseRowEditor';

type ManagerTab = 'browse' | 'structure' | 'sql';

function cellDisplay(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function cellKind(value: unknown): 'null' | 'number' | 'bool' | 'text' {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string' && value !== '' && !Number.isNaN(Number(value)) && /^-?\d+(\.\d+)?$/.test(value)) {
    return 'number';
  }
  return 'text';
}

function formatCount(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString();
}

function quoteIdent(name: string): string {
  return `\`${name.replace(/`/g, '``')}\``;
}

export function DatabaseManagerModal({
  serverId,
  database,
  capabilities,
  onClose,
}: {
  serverId: string;
  database: ServerDatabaseSummary;
  capabilities: DatabaseManagerMeta;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tables, setTables] = useState<DatabaseManagerTableSummary[]>([]);
  const [tableFilter, setTableFilter] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<DatabaseManagerTableResponse | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [tab, setTab] = useState<ManagerTab>('browse');
  const [sql, setSql] = useState('');
  const [queryResult, setQueryResult] = useState<DatabaseManagerQueryResponse | null>(null);
  const [scriptResult, setScriptResult] = useState<DatabaseManagerScriptResponse | null>(null);
  const [queryBusy, setQueryBusy] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedHint, setCopiedHint] = useState('');
  const [queryMs, setQueryMs] = useState<number | null>(null);
  const [editor, setEditor] = useState<{ mode: 'insert' | 'edit'; row?: Record<string, unknown> } | null>(null);
  const [editorBusy, setEditorBusy] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [pendingSqlUpload, setPendingSqlUpload] = useState<{ text: string; name: string } | null>(null);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState(false);
  const sqlRef = useRef(sql);
  sqlRef.current = sql;

  const loadSchema = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (opts?.soft) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const res = await api.client.databaseManager(serverId, database.id);
        setTables(res.tables);
        setSelectedTable((prev) => {
          if (prev && res.tables.some((t) => t.name === prev)) return prev;
          return res.tables[0]?.name ?? null;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to open database manager');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [serverId, database.id],
  );

  useEffect(() => {
    void loadSchema();
  }, [loadSchema]);

  const loadTable = useCallback(
    async (table: string, nextPage: number, size = pageSize) => {
      setTableLoading(true);
      setError('');
      try {
        const res = await api.client.databaseManagerTable(serverId, database.id, table, {
          page: nextPage,
          pageSize: size,
        });
        setTableData(res);
        setPage(nextPage);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load table');
        setTableData(null);
      } finally {
        setTableLoading(false);
      }
    },
    [serverId, database.id, pageSize],
  );

  useEffect(() => {
    if (!selectedTable || tab === 'sql') return;
    void loadTable(selectedTable, 1);
  }, [selectedTable, pageSize, loadTable, tab]);

  const filteredTables = useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((t) => t.name.toLowerCase().includes(q));
  }, [tables, tableFilter]);

  const totalPages = useMemo(() => {
    if (!tableData) return 1;
    return Math.max(1, Math.ceil(tableData.total / tableData.pageSize));
  }, [tableData]);

  const selectedMeta = useMemo(
    () => tables.find((t) => t.name === selectedTable) ?? null,
    [tables, selectedTable],
  );

  const primaryKey = tableData?.primaryKey ?? [];
  const canEditRows = Boolean(capabilities.canEdit && selectedTable && primaryKey.length > 0);

  async function copyText(value: string, label = 'Copied') {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedHint(label);
      window.setTimeout(() => setCopiedHint(''), 1400);
    } catch {
      setError('Could not copy to clipboard');
    }
  }

  function selectTable(name: string) {
    setSelectedTable(name);
    setTab('browse');
    setQueryResult(null);
  }

  function openSqlForTable(name: string) {
    setSelectedTable(name);
    setSql(`SELECT * FROM ${quoteIdent(name)} LIMIT 100`);
    setTab('sql');
    setQueryResult(null);
  }

  async function runSql(overrideSql?: string) {
    const statement = (overrideSql ?? sqlRef.current).trim();
    if (!statement) return;
    setQueryBusy(true);
    setError('');
    setQueryResult(null);
    setScriptResult(null);
    const started = performance.now();
    try {
      const res = await api.client.databaseManagerQuery(serverId, database.id, statement);
      setQueryResult(res);
      setQueryMs(Math.round(performance.now() - started));
      if (selectedTable && res.kind === 'result') {
        void loadTable(selectedTable, page);
        void loadSchema({ soft: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed');
      setQueryMs(null);
    } finally {
      setQueryBusy(false);
    }
  }

  async function runUploadedScript(content: string, fileName: string) {
    setQueryBusy(true);
    setError('');
    setQueryResult(null);
    setScriptResult(null);
    setUploadName(fileName);
    setSql(content);
    const started = performance.now();
    try {
      const res = await api.client.databaseManagerScript(serverId, database.id, content, fileName);
      setScriptResult(res);
      setQueryMs(Math.round(performance.now() - started));
      if (selectedTable) void loadTable(selectedTable, page);
      void loadSchema({ soft: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SQL import failed');
      setQueryMs(null);
    } finally {
      setQueryBusy(false);
    }
  }

  async function handleSqlFile(file: File | null | undefined) {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.sql') && !lower.endsWith('.txt')) {
      setError('Please upload a .sql or .txt file');
      return;
    }
    if (file.size > 2_000_000) {
      setError('SQL file is too large (max 2 MB)');
      return;
    }
    const text = await file.text();
    if (!text.trim()) {
      setError('SQL file is empty');
      return;
    }
    setPendingSqlUpload({ text, name: file.name });
  }

  async function confirmRunSqlUpload() {
    if (!pendingSqlUpload) return;
    const { text, name } = pendingSqlUpload;
    setPendingSqlUpload(null);
    await runUploadedScript(text, name);
  }

  function loadSqlUploadIntoEditor() {
    if (!pendingSqlUpload) return;
    setSql(pendingSqlUpload.text);
    setUploadName(pendingSqlUpload.name);
    setTab('sql');
    setPendingSqlUpload(null);
  }

  const runSqlRef = useRef(runSql);
  runSqlRef.current = runSql;

  async function saveEditor(values: Record<string, string | number | boolean | null>) {
    if (!selectedTable || !editor) return;
    setEditorBusy(true);
    setEditorError('');
    try {
      if (editor.mode === 'insert') {
        await api.client.databaseManagerInsertRow(serverId, database.id, selectedTable, values);
      } else {
        const pk = editor.row ? rowPrimaryKey(editor.row, primaryKey) : null;
        if (!pk) throw new Error('Primary key is missing for this row');
        const patch: Record<string, string | number | boolean | null> = { ...values };
        for (const key of primaryKey) delete patch[key];
        await api.client.databaseManagerUpdateRow(serverId, database.id, selectedTable, pk, patch);
      }
      setEditor(null);
      await loadTable(selectedTable, page);
      void loadSchema({ soft: true });
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setEditorBusy(false);
    }
  }

  async function deleteEditorRow() {
    if (!selectedTable || !editor?.row) return;
    const pk = rowPrimaryKey(editor.row, primaryKey);
    if (!pk) {
      setEditorError('Primary key is missing for this row');
      return;
    }
    setEditorBusy(true);
    setEditorError('');
    try {
      await api.client.databaseManagerDeleteRow(serverId, database.id, selectedTable, pk);
      setEditor(null);
      setConfirmDeleteRow(false);
      await loadTable(selectedTable, page);
      void loadSchema({ soft: true });
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setEditorBusy(false);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (editor) {
          setEditor(null);
          return;
        }
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && tab === 'sql' && capabilities.allowSqlConsole) {
        e.preventDefault();
        void runSqlRef.current();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, tab, capabilities.allowSqlConsole, editor]);

  const modeLabel = capabilities.canEdit ? 'Read & write' : 'Read only';

  return (
    <div className="ds-srv-dbm-overlay" role="dialog" aria-modal="true" aria-label="Database manager">
      <div className="ds-srv-dbm-modal">
        <header className="ds-srv-dbm-header">
          <div className="ds-srv-dbm-header-accent" aria-hidden />
          <div className="ds-srv-dbm-header-main">
            <span className="ds-srv-dbm-header-icon" aria-hidden>
              <Database className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="ds-srv-dbm-title-row">
                <h2 className="ds-srv-dbm-title">{database.name}</h2>
                <span className={`ds-srv-dbm-pill${capabilities.canEdit ? ' is-write' : ' is-ro'}`}>
                  {capabilities.canEdit ? <Braces className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {modeLabel}
                </span>
              </div>
              <p className="ds-srv-dbm-sub">
                <code>{database.database}</code>
                <span aria-hidden>·</span>
                {database.host}:{database.port}
                <span aria-hidden>·</span>
                {tables.length} table{tables.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="ds-srv-dbm-header-actions">
            {copiedHint ? <span className="ds-srv-dbm-copied">{copiedHint}</span> : null}
            <button
              type="button"
              className="ds-srv-dbm-icon-btn"
              title="Refresh schema"
              disabled={loading || refreshing}
              onClick={() => void loadSchema({ soft: true })}
            >
              <RefreshCw className={`h-3.5 w-3.5${refreshing ? ' ds-srv-dbm-spin' : ''}`} />
            </button>
            <button type="button" className="ds-srv-dbm-icon-btn" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {error ? (
          <div className="ds-srv-dbm-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')}>
              Dismiss
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="ds-srv-dbm-loading">
            <Spinner className="h-8 w-8" />
            <p>Connecting to {database.database}…</p>
          </div>
        ) : (
          <div className="ds-srv-dbm-body">
            <aside className="ds-srv-dbm-sidebar">
              <div className="ds-srv-dbm-sidebar-head">
                <p className="ds-srv-dbm-sidebar-label">Schema</p>
                <span className="ds-srv-dbm-sidebar-count">{filteredTables.length}</span>
              </div>
              <div className="ds-srv-dbm-search-wrap">
                <Search className="ds-srv-dbm-search-icon" aria-hidden />
                <input
                  className="ds-srv-dbm-search"
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  placeholder="Filter tables…"
                  aria-label="Filter tables"
                />
              </div>
              {filteredTables.length === 0 ? (
                <p className="ds-srv-dbm-empty">
                  {tables.length === 0 ? 'No tables in this database yet.' : 'No tables match your filter.'}
                </p>
              ) : (
                <ul className="ds-srv-dbm-table-list">
                  {filteredTables.map((t) => {
                    const isView = /view/i.test(t.type);
                    return (
                      <li key={t.name}>
                        <button
                          type="button"
                          className={`ds-srv-dbm-table-btn${selectedTable === t.name ? ' is-active' : ''}`}
                          onClick={() => selectTable(t.name)}
                          onDoubleClick={() => capabilities.allowSqlConsole && openSqlForTable(t.name)}
                          title={capabilities.allowSqlConsole ? 'Double-click to query in SQL' : t.name}
                        >
                          {isView ? (
                            <Eye className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                          ) : (
                            <Table2 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                          )}
                          <span className="ds-srv-dbm-table-name truncate">{t.name}</span>
                          <span className="ds-srv-dbm-table-meta">{formatCount(t.approxRows)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </aside>

            <section className="ds-srv-dbm-main">
              <div className="ds-srv-dbm-toolbar">
                <div className="ds-srv-dbm-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'browse'}
                    className={`ds-srv-dbm-tab${tab === 'browse' ? ' is-active' : ''}`}
                    onClick={() => setTab('browse')}
                    disabled={!selectedTable}
                  >
                    <Table2 className="h-3.5 w-3.5" aria-hidden />
                    Browse
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'structure'}
                    className={`ds-srv-dbm-tab${tab === 'structure' ? ' is-active' : ''}`}
                    onClick={() => setTab('structure')}
                    disabled={!selectedTable}
                  >
                    <Columns3 className="h-3.5 w-3.5" aria-hidden />
                    Structure
                  </button>
                  {capabilities.allowSqlConsole ? (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={tab === 'sql'}
                      className={`ds-srv-dbm-tab${tab === 'sql' ? ' is-active' : ''}`}
                      onClick={() => {
                        if (!sql.trim() && selectedTable) {
                          setSql(`SELECT * FROM ${quoteIdent(selectedTable)} LIMIT 100`);
                        }
                        setTab('sql');
                      }}
                    >
                      <Terminal className="h-3.5 w-3.5" aria-hidden />
                      SQL
                    </button>
                  ) : null}
                </div>

                {selectedTable && tab !== 'sql' ? (
                  <div className="ds-srv-dbm-toolbar-meta">
                    <span className="ds-srv-dbm-current-table" title={selectedTable}>
                      {selectedTable}
                    </span>
                    {selectedMeta?.engine ? <span className="ds-srv-dbm-chip">{selectedMeta.engine}</span> : null}
                    <button
                      type="button"
                      className="ds-srv-dbm-text-btn"
                      disabled={tableLoading}
                      onClick={() => void loadTable(selectedTable, page)}
                    >
                      <RefreshCw className={`h-3 w-3${tableLoading ? ' ds-srv-dbm-spin' : ''}`} />
                      Refresh
                    </button>
                    {capabilities.canEdit && tab === 'browse' ? (
                      <button
                        type="button"
                        className="ds-srv-dbm-text-btn"
                        disabled={!canEditRows}
                        title={
                          primaryKey.length
                            ? 'Insert a new row'
                            : 'Insert requires a primary key on this table'
                        }
                        onClick={() => {
                          setEditorError('');
                          setEditor({ mode: 'insert' });
                        }}
                      >
                        <Plus className="h-3 w-3" />
                        Insert
                      </button>
                    ) : null}
                    {capabilities.allowSqlConsole ? (
                      <button type="button" className="ds-srv-dbm-text-btn" onClick={() => openSqlForTable(selectedTable)}>
                        <Terminal className="h-3 w-3" />
                        Query
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {tab === 'sql' && capabilities.allowSqlConsole ? (
                <div className="ds-srv-dbm-sql">
                  <div
                    className={`ds-srv-dbm-upload${dragOver ? ' is-drag' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      void handleSqlFile(e.dataTransfer.files?.[0]);
                    }}
                  >
                    <div className="ds-srv-dbm-upload-main">
                      <span className="ds-srv-dbm-upload-icon" aria-hidden>
                        <Upload className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="ds-srv-dbm-upload-title">Upload a SQL file</p>
                        <p className="ds-srv-dbm-upload-sub">
                          Drop a <code>.sql</code> dump here, or browse. Max 2 MB.
                          {capabilities.canEdit
                            ? ' Imports can include CREATE / INSERT / UPDATE / DELETE.'
                            : ' Read-only accounts can only run SELECT scripts.'}
                        </p>
                        {uploadName ? <p className="ds-srv-dbm-upload-file">Loaded: {uploadName}</p> : null}
                      </div>
                    </div>
                    <div className="ds-srv-dbm-upload-actions">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".sql,.txt,text/plain,application/sql"
                        className="sr-only"
                        onChange={(e) => {
                          void handleSqlFile(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        className="ds-srv-dbm-text-btn"
                        disabled={queryBusy}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-3 w-3" />
                        Choose file
                      </button>
                    </div>
                  </div>

                  <div className="ds-srv-dbm-sql-editor">
                    <textarea
                      className="ds-srv-dbm-sql-input"
                      value={sql}
                      onChange={(e) => setSql(e.target.value)}
                      rows={7}
                      spellCheck={false}
                      placeholder={'SELECT * FROM …\n-- or paste / upload a .sql script'}
                    />
                    <div className="ds-srv-dbm-sql-actions">
                      <button
                        type="button"
                        className="ds-srv-dbm-run"
                        disabled={queryBusy || !sql.trim()}
                        onClick={() => void runSql()}
                      >
                        <Play className="h-3.5 w-3.5" aria-hidden />
                        {queryBusy ? 'Running…' : 'Run query'}
                      </button>
                      <button
                        type="button"
                        className="ds-srv-dbm-text-btn"
                        disabled={queryBusy || !sql.trim()}
                        title="Run the editor contents as a multi-statement script"
                        onClick={() => void runUploadedScript(sql, uploadName || 'editor.sql')}
                      >
                        <Upload className="h-3 w-3" />
                        Run as script
                      </button>
                      <span className="ds-srv-dbm-hint">
                        Ctrl/⌘+Enter runs a single statement · Script mode supports full .sql files
                      </span>
                    </div>
                  </div>
                  {scriptResult ? (
                    <div className="ds-srv-dbm-query-banner is-ok">
                      <strong>Import complete</strong>
                      <span>
                        {scriptResult.statements} statement{scriptResult.statements === 1 ? '' : 's'} ·{' '}
                        {scriptResult.affectedRows} row(s) affected
                        {queryMs != null ? ` · ${queryMs} ms` : ''}
                        {uploadName ? ` · ${uploadName}` : ''}
                      </span>
                    </div>
                  ) : null}
                  {queryResult ? (
                    queryResult.kind === 'result' ? (
                      <div className="ds-srv-dbm-query-banner is-ok">
                        <strong>{queryResult.verb}</strong>
                        <span>
                          {queryResult.affectedRows} row{queryResult.affectedRows === 1 ? '' : 's'} affected
                          {queryResult.insertId ? ` · insert id ${queryResult.insertId}` : ''}
                          {queryMs != null ? ` · ${queryMs} ms` : ''}
                        </span>
                      </div>
                    ) : (
                      <div className="ds-srv-dbm-grid-wrap">
                        <div className="ds-srv-dbm-pager">
                          <span>
                            {queryResult.rowCount} row{queryResult.rowCount === 1 ? '' : 's'}
                            {queryResult.truncated ? ' (truncated)' : ''}
                            {queryMs != null ? ` · ${queryMs} ms` : ''}
                          </span>
                        </div>
                        <ResultGrid
                          columns={queryResult.columns}
                          rows={queryResult.rows}
                          onCopy={(text) => void copyText(text)}
                        />
                      </div>
                    )
                  ) : !scriptResult ? (
                    <div className="ds-srv-dbm-empty-main">
                      <Terminal className="h-5 w-5 opacity-50" />
                      <p>Write a query, or upload a .sql file to import.</p>
                    </div>
                  ) : null}
                </div>
              ) : tableLoading && !tableData ? (
                <div className="ds-srv-dbm-loading">
                  <Spinner className="h-6 w-6" />
                  <p>Loading table…</p>
                </div>
              ) : !selectedTable || !tableData ? (
                <div className="ds-srv-dbm-empty-main">
                  <Table2 className="h-5 w-5 opacity-50" />
                  <p>Select a table to browse rows and structure.</p>
                </div>
              ) : tab === 'structure' ? (
                <div className="ds-srv-dbm-grid-wrap">
                  <div className="ds-srv-dbm-pager">
                    <span>
                      {tableData.columns.length} column{tableData.columns.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="ds-srv-dbm-scroll">
                    <table className="ds-srv-dbm-grid ds-srv-dbm-grid--structure">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Field</th>
                          <th>Type</th>
                          <th>Null</th>
                          <th>Key</th>
                          <th>Default</th>
                          <th>Extra</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.columns.map((col, i) => (
                          <tr key={col.field}>
                            <td className="ds-srv-dbm-rownum">{i + 1}</td>
                            <td>
                              <button
                                type="button"
                                className="ds-srv-dbm-field-btn"
                                title="Copy field name"
                                onClick={() => void copyText(col.field, 'Field copied')}
                              >
                                {col.field}
                              </button>
                            </td>
                            <td>
                              <code className="ds-srv-dbm-type">{col.type}</code>
                            </td>
                            <td>
                              <span className={`ds-srv-dbm-null-pill${col.null === 'YES' ? ' is-yes' : ''}`}>
                                {col.null}
                              </span>
                            </td>
                            <td>
                              {col.key ? (
                                <span className={`ds-srv-dbm-key-pill is-${col.key.toLowerCase()}`}>{col.key}</span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className={cellKind(col.default) === 'null' ? 'is-null' : ''}>
                              {cellDisplay(col.default)}
                            </td>
                            <td>{col.extra || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="ds-srv-dbm-grid-wrap">
                  <div className="ds-srv-dbm-pager">
                    <span>
                      {formatCount(tableData.total)} row{tableData.total === 1 ? '' : 's'} · page {page} / {totalPages}
                    </span>
                    <div className="ds-srv-dbm-pager-controls">
                      <label className="ds-srv-dbm-page-size">
                        <span>Rows</span>
                        <select
                          value={pageSize}
                          onChange={(e) => setPageSize(Number(e.target.value))}
                          disabled={tableLoading}
                        >
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </label>
                      <div className="ds-srv-dbm-pager-btns">
                        <button
                          type="button"
                          disabled={page <= 1 || tableLoading}
                          aria-label="Previous page"
                          onClick={() => selectedTable && void loadTable(selectedTable, page - 1)}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={page >= totalPages || tableLoading}
                          aria-label="Next page"
                          onClick={() => selectedTable && void loadTable(selectedTable, page + 1)}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <ResultGrid
                    columns={tableData.columns.map((c) => c.field)}
                    rows={tableData.rows}
                    loading={tableLoading}
                    pageOffset={(page - 1) * tableData.pageSize}
                    canEdit={canEditRows}
                    onCopy={(text) => void copyText(text)}
                    onEditRow={(row) => {
                      setEditorError('');
                      setEditor({ mode: 'edit', row });
                    }}
                  />
                </div>
              )}
            </section>
          </div>
        )}

        <footer className="ds-srv-dbm-footer">
          <span>Built-in Database Manager</span>
          <span>
            Connected as <code>{database.username}</code>
            {capabilities.canEdit ? ' · editing enabled' : ' · read only'}
          </span>
        </footer>
      </div>

      {editor && selectedTable && tableData ? (
        <DatabaseRowEditor
          mode={editor.mode}
          columns={tableData.columns}
          primaryKey={primaryKey}
          initialRow={editor.row}
          busy={editorBusy}
          error={editorError}
          onClose={() => setEditor(null)}
          onSave={(values) => void saveEditor(values)}
          onDelete={editor.mode === 'edit' ? () => setConfirmDeleteRow(true) : undefined}
        />
      ) : null}

      <ConfirmModal
        open={pendingSqlUpload !== null}
        title="Run SQL file?"
        description={`Run "${pendingSqlUpload?.name ?? 'this file'}" against ${database.database}? This executes every statement in the file.`}
        confirmLabel="Run now"
        cancelLabel="Open in editor"
        tone="warning"
        loading={queryBusy}
        onClose={loadSqlUploadIntoEditor}
        onConfirm={() => void confirmRunSqlUpload()}
      />

      <ConfirmModal
        open={confirmDeleteRow}
        title="Delete this row?"
        description="This permanently deletes the selected row from the table."
        confirmLabel="Delete row"
        tone="danger"
        loading={editorBusy}
        onClose={() => {
          if (!editorBusy) setConfirmDeleteRow(false);
        }}
        onConfirm={() => void deleteEditorRow()}
      />
    </div>
  );
}

function ResultGrid({
  columns,
  rows,
  loading,
  pageOffset = 0,
  canEdit,
  onCopy,
  onEditRow,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
  loading?: boolean;
  pageOffset?: number;
  canEdit?: boolean;
  onCopy?: (text: string) => void;
  onEditRow?: (row: Record<string, unknown>) => void;
}) {
  if (!columns.length) {
    return <p className="ds-srv-dbm-empty-main">No columns.</p>;
  }
  return (
    <div className={`ds-srv-dbm-scroll${loading ? ' is-loading' : ''}`}>
      <table className="ds-srv-dbm-grid">
        <thead>
          <tr>
            <th className="ds-srv-dbm-rownum">#</th>
            {canEdit ? <th className="ds-srv-dbm-actions-col">Edit</th> : null}
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (canEdit ? 2 : 1)} className="ds-srv-dbm-empty-cell">
                No rows on this page
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={idx}>
                <td className="ds-srv-dbm-rownum">{pageOffset + idx + 1}</td>
                {canEdit ? (
                  <td className="ds-srv-dbm-actions-col">
                    <button
                      type="button"
                      className="ds-srv-dbm-row-edit"
                      title="Edit row"
                      onClick={() => onEditRow?.(row)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                ) : null}
                {columns.map((col) => {
                  const value = row[col];
                  const kind = cellKind(value);
                  const text = cellDisplay(value);
                  return (
                    <td
                      key={col}
                      className={`ds-srv-dbm-cell is-${kind}`}
                      title={text}
                      onDoubleClick={() => {
                        if (canEdit) onEditRow?.(row);
                        else onCopy?.(kind === 'null' ? '' : text);
                      }}
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
