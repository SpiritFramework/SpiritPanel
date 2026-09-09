const READ_VERBS = new Set(['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN']);
const WRITE_VERBS = new Set(['INSERT', 'UPDATE', 'DELETE', 'REPLACE']);
/** Allowed for .sql imports only (still no GRANT / LOAD / SET GLOBAL). */
const DDL_VERBS = new Set(['CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'RENAME']);

export type SqlClass = 'read' | 'write' | 'ddl' | 'blocked';

export function classifySql(
  sql: string,
  opts?: { allowMulti?: boolean; allowComments?: boolean; allowDdl?: boolean },
): { verb: string; kind: SqlClass } {
  const trimmed = sql.trim();
  if (!trimmed) return { verb: '', kind: 'blocked' };

  if (!opts?.allowMulti && trimmed.includes(';')) {
    return { verb: 'MULTI', kind: 'blocked' };
  }
  if (!opts?.allowComments && /\/\*|\-\-|\#/.test(trimmed)) {
    return { verb: 'COMMENT', kind: 'blocked' };
  }

  const match = trimmed.match(/^([a-zA-Z]+)/);
  const verb = (match?.[1] ?? '').toUpperCase();

  // Dangerous MySQL clauses even under SELECT / write verbs.
  if (
    /\bINTO\s+(OUTFILE|DUMPFILE)\b/i.test(trimmed) ||
    /\bLOAD_FILE\s*\(/i.test(trimmed) ||
    /\bLOAD\s+DATA\b/i.test(trimmed) ||
    /\bINTO\s+OUTFILE\b/i.test(trimmed)
  ) {
    return { verb: verb || 'FILE', kind: 'blocked' };
  }

  if (READ_VERBS.has(verb)) return { verb, kind: 'read' };
  if (WRITE_VERBS.has(verb)) return { verb, kind: 'write' };
  if (opts?.allowDdl && DDL_VERBS.has(verb)) return { verb, kind: 'ddl' };
  return { verb: verb || 'UNKNOWN', kind: 'blocked' };
}

/**
 * Split a SQL script into statements. Honors single/double/backtick quotes and
 * skips ; inside comments.
 */
export function splitSqlStatements(script: string): string[] {
  const out: string[] = [];
  let buf = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  while (i < script.length) {
    const ch = script[i];
    const next = script[i + 1];

    if (inLineComment) {
      buf += ch;
      if (ch === '\n') inLineComment = false;
      i += 1;
      continue;
    }

    if (inBlockComment) {
      buf += ch;
      if (ch === '*' && next === '/') {
        buf += next;
        i += 2;
        inBlockComment = false;
        continue;
      }
      i += 1;
      continue;
    }

    if (!inSingle && !inDouble && !inBacktick) {
      if (ch === '-' && next === '-') {
        inLineComment = true;
        buf += ch;
        i += 1;
        continue;
      }
      if (ch === '#') {
        inLineComment = true;
        buf += ch;
        i += 1;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        buf += ch;
        i += 1;
        continue;
      }
      if (ch === ';') {
        const stmt = buf.trim();
        if (stmt) out.push(stmt);
        buf = '';
        i += 1;
        continue;
      }
    }

    if (!inDouble && !inBacktick && ch === "'" && !inSingle) {
      inSingle = true;
      buf += ch;
      i += 1;
      continue;
    }
    if (inSingle) {
      buf += ch;
      if (ch === '\\' && next != null) {
        buf += next;
        i += 2;
        continue;
      }
      if (ch === "'" && next === "'") {
        buf += next;
        i += 2;
        continue;
      }
      if (ch === "'") inSingle = false;
      i += 1;
      continue;
    }

    if (!inSingle && !inBacktick && ch === '"' && !inDouble) {
      inDouble = true;
      buf += ch;
      i += 1;
      continue;
    }
    if (inDouble) {
      buf += ch;
      if (ch === '\\' && next != null) {
        buf += next;
        i += 2;
        continue;
      }
      if (ch === '"' && next === '"') {
        buf += next;
        i += 2;
        continue;
      }
      if (ch === '"') inDouble = false;
      i += 1;
      continue;
    }

    if (!inSingle && !inDouble && ch === '`' && !inBacktick) {
      inBacktick = true;
      buf += ch;
      i += 1;
      continue;
    }
    if (inBacktick) {
      buf += ch;
      if (ch === '`' && next === '`') {
        buf += next;
        i += 2;
        continue;
      }
      if (ch === '`') inBacktick = false;
      i += 1;
      continue;
    }

    buf += ch;
    i += 1;
  }

  const last = buf.trim();
  if (last) out.push(last);
  return out;
}

/** Strip leading comments from a statement for verb classification. */
export function stripLeadingSqlNoise(sql: string): string {
  return sql
    .replace(/^(\s*--[^\n]*\n|\s*#[^\n]*\n|\s*\/\*[\s\S]*?\*\/\s*)+/g, '')
    .trim();
}

export function quoteIdent(name: string): string {
  if (!name || name.length > 64 || name.includes('\0')) {
    throw Object.assign(new Error('Invalid identifier'), { statusCode: 400 });
  }
  return `\`${name.replace(/`/g, '``')}\``;
}
