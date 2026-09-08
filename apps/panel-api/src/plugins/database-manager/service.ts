import mysql, { type Connection, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise';
import { prisma } from '../../lib/prisma.js';
import { decryptSecret } from '../../lib/secret-crypto.js';
import { classifySql, quoteIdent, splitSqlStatements, stripLeadingSqlNoise } from './sql-guard.js';

const MAX_PAGE_SIZE = 100;
const MAX_QUERY_ROWS = 500;
const MAX_SCRIPT_BYTES = 2_000_000;
const MAX_SCRIPT_STATEMENTS = 500;

export type DatabaseManagerCapabilities = {
  allowSqlConsole: boolean;
  allowDataEdits: boolean;
};

export type ManagerColumn = {
  field: string;
  type: string;
  null: string;
  key: string;
  default: unknown;
  extra: string;
  comment: string;
};

function serializeCell(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Buffer.isBuffer(value)) return `base64:${value.toString('base64')}`;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function serializeRows(rows: RowDataPacket[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      out[key] = serializeCell(value);
    }
    return out;
  });
}

function mapColumns(columns: RowDataPacket[]): ManagerColumn[] {
  return columns.map((c) => ({
    field: String(c.Field),
    type: String(c.Type),
    null: String(c.Null),
    key: String(c.Key ?? ''),
    default: c.Default == null ? null : serializeCell(c.Default),
    extra: String(c.Extra ?? ''),
    comment: c.Comment != null ? String(c.Comment) : '',
  }));
}

function primaryKeyFields(columns: ManagerColumn[]): string[] {
  return columns.filter((c) => c.key === 'PRI').map((c) => c.field);
}

async function withUserConnection<T>(
  databaseId: string,
  serverId: string,
  fn: (conn: Connection, databaseName: string) => Promise<T>,
): Promise<T> {
  const row = await prisma.serverDatabase.findFirst({
    where: { id: databaseId, serverId },
    include: {
      databaseHost: { select: { host: true, port: true } },
    },
  });
  if (!row) {
    throw Object.assign(new Error('Database not found'), { statusCode: 404 });
  }

  const password = decryptSecret(row.password);
  const conn = await mysql.createConnection({
    host: row.databaseHost.host,
    port: row.databaseHost.port,
    user: row.username,
    password,
    database: row.database,
    multipleStatements: false,
    connectTimeout: 12_000,
    dateStrings: false,
  });

  try {
    return await fn(conn, row.database);
  } finally {
    await conn.end().catch(() => undefined);
  }
}

async function loadTableColumns(conn: Connection, table: string): Promise<ManagerColumn[]> {
  const [exists] = await conn.query<RowDataPacket[]>(
    `SELECT 1 AS ok FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     LIMIT 1`,
    [table],
  );
  if (!exists.length) {
    throw Object.assign(new Error('Table not found'), { statusCode: 404 });
  }
  const [columns] = await conn.query<RowDataPacket[]>(`SHOW FULL COLUMNS FROM ${quoteIdent(table)}`);
  return mapColumns(columns);
}

function assertKnownFields(columns: ManagerColumn[], fields: string[]) {
  const allowed = new Set(columns.map((c) => c.field));
  for (const field of fields) {
    if (!allowed.has(field)) {
      throw Object.assign(new Error(`Unknown column: ${field}`), { statusCode: 400 });
    }
  }
}

function normalizeSqlValue(value: unknown): unknown {
  if (value === undefined) return null;
  return value;
}

export async function listManagerTables(databaseId: string, serverId: string) {
  return withUserConnection(databaseId, serverId, async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT TABLE_NAME AS name,
              TABLE_TYPE AS type,
              ENGINE AS engine,
              TABLE_ROWS AS approxRows,
              DATA_LENGTH AS dataLength,
              INDEX_LENGTH AS indexLength
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
       ORDER BY TABLE_NAME ASC`,
    );
    return rows.map((r) => ({
      name: String(r.name),
      type: String(r.type ?? 'BASE TABLE'),
      engine: r.engine ? String(r.engine) : null,
      approxRows: r.approxRows != null ? Number(r.approxRows) : null,
      dataLength: r.dataLength != null ? Number(r.dataLength) : null,
      indexLength: r.indexLength != null ? Number(r.indexLength) : null,
    }));
  });
}

export async function getManagerTable(
  databaseId: string,
  serverId: string,
  table: string,
  opts: { page: number; pageSize: number },
) {
  const page = Math.max(1, opts.page);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, opts.pageSize));
  const offset = (page - 1) * pageSize;
  const ident = quoteIdent(table);

  return withUserConnection(databaseId, serverId, async (conn) => {
    const columns = await loadTableColumns(conn, table);
    const [countRows] = await conn.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ${ident}`);
    const total = Number(countRows[0]?.total ?? 0);
    const [dataRows] = await conn.query<RowDataPacket[]>(
      `SELECT * FROM ${ident} LIMIT ? OFFSET ?`,
      [pageSize, offset],
    );

    return {
      table,
      columns,
      primaryKey: primaryKeyFields(columns),
      page,
      pageSize,
      total,
      rows: serializeRows(dataRows),
    };
  });
}

export async function runManagerQuery(
  databaseId: string,
  serverId: string,
  sql: string,
  capabilities: DatabaseManagerCapabilities,
) {
  if (!capabilities.allowSqlConsole) {
    throw Object.assign(new Error('SQL console is disabled'), { statusCode: 403 });
  }

  const { verb, kind } = classifySql(sql);
  if (kind === 'blocked') {
    throw Object.assign(new Error(`Statement type not allowed (${verb || 'empty'})`), {
      statusCode: 400,
    });
  }
  if (kind === 'write' && !capabilities.allowDataEdits) {
    throw Object.assign(new Error('Data edits are disabled for the database manager'), {
      statusCode: 403,
    });
  }

  return withUserConnection(databaseId, serverId, async (conn) => {
    const [result, fields] = await conn.query(sql);

    if (Array.isArray(result)) {
      const rows = result as RowDataPacket[];
      const truncated = rows.length > MAX_QUERY_ROWS;
      const slice = truncated ? rows.slice(0, MAX_QUERY_ROWS) : rows;
      return {
        kind: 'rows' as const,
        verb,
        columns: (fields ?? []).map((f) => f.name),
        rows: serializeRows(slice),
        rowCount: slice.length,
        truncated,
      };
    }

    const header = result as ResultSetHeader;
    return {
      kind: 'result' as const,
      verb,
      affectedRows: header.affectedRows ?? 0,
      insertId: header.insertId ? String(header.insertId) : null,
      warningStatus: header.warningStatus ?? 0,
    };
  });
}

export async function runManagerScript(
  databaseId: string,
  serverId: string,
  script: string,
  capabilities: DatabaseManagerCapabilities,
) {
  if (!capabilities.allowSqlConsole) {
    throw Object.assign(new Error('SQL console is disabled'), { statusCode: 403 });
  }
  if (Buffer.byteLength(script, 'utf8') > MAX_SCRIPT_BYTES) {
    throw Object.assign(new Error('SQL file is too large (max 2 MB)'), { statusCode: 400 });
  }

  const statements = splitSqlStatements(script);
  if (!statements.length) {
    throw Object.assign(new Error('SQL file has no statements'), { statusCode: 400 });
  }
  if (statements.length > MAX_SCRIPT_STATEMENTS) {
    throw Object.assign(new Error(`Too many statements (max ${MAX_SCRIPT_STATEMENTS})`), {
      statusCode: 400,
    });
  }

  // Preview classification before opening a connection.
  for (const stmt of statements) {
    const cleaned = stripLeadingSqlNoise(stmt);
    if (!cleaned) continue;
    const { verb, kind } = classifySql(cleaned, {
      allowMulti: true,
      allowComments: true,
      allowDdl: capabilities.allowDataEdits,
    });
    if (kind === 'blocked') {
      throw Object.assign(new Error(`Statement not allowed in import (${verb || 'empty'})`), {
        statusCode: 400,
      });
    }
    if ((kind === 'write' || kind === 'ddl') && !capabilities.allowDataEdits) {
      throw Object.assign(new Error('This SQL file needs write permission to run'), {
        statusCode: 403,
      });
    }
  }

  return withUserConnection(databaseId, serverId, async (conn) => {
    let ran = 0;
    let affectedRows = 0;
    const results: Array<{ index: number; verb: string; affectedRows: number }> = [];

    for (let index = 0; index < statements.length; index += 1) {
      const cleaned = stripLeadingSqlNoise(statements[index]);
      if (!cleaned) continue;
      const { verb, kind } = classifySql(cleaned, {
        allowMulti: true,
        allowComments: true,
        allowDdl: capabilities.allowDataEdits,
      });
      if (kind === 'blocked') {
        throw Object.assign(new Error(`Stopped at statement ${index + 1}: ${verb} not allowed`), {
          statusCode: 400,
        });
      }
      if ((kind === 'write' || kind === 'ddl') && !capabilities.allowDataEdits) {
        throw Object.assign(new Error(`Stopped at statement ${index + 1}: writes are not allowed`), {
          statusCode: 403,
        });
      }

      try {
        const [result] = await conn.query(cleaned);
        const rows =
          result && typeof result === 'object' && 'affectedRows' in result
            ? Number((result as ResultSetHeader).affectedRows ?? 0)
            : 0;
        affectedRows += rows;
        ran += 1;
        results.push({ index: index + 1, verb, affectedRows: rows });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Statement failed';
        throw Object.assign(new Error(`Stopped at statement ${index + 1} (${verb}): ${message}`), {
          statusCode: 400,
        });
      }
    }

    return {
      kind: 'script' as const,
      statements: ran,
      affectedRows,
      results: results.slice(0, 50),
      truncatedResults: results.length > 50,
    };
  });
}

function requireEdits(capabilities: DatabaseManagerCapabilities) {
  if (!capabilities.allowDataEdits) {
    throw Object.assign(new Error('Data edits are disabled for the database manager'), {
      statusCode: 403,
    });
  }
}

export async function insertManagerRow(
  databaseId: string,
  serverId: string,
  table: string,
  values: Record<string, unknown>,
  capabilities: DatabaseManagerCapabilities,
) {
  requireEdits(capabilities);
  return withUserConnection(databaseId, serverId, async (conn) => {
    const columns = await loadTableColumns(conn, table);
    const fields = Object.keys(values);
    if (!fields.length) {
      throw Object.assign(new Error('No values provided'), { statusCode: 400 });
    }
    assertKnownFields(columns, fields);

    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO ${quoteIdent(table)} (${fields.map(quoteIdent).join(', ')}) VALUES (${placeholders})`;
    const params = fields.map((f) => normalizeSqlValue(values[f]));
    const [result] = await conn.query<ResultSetHeader>(sql, params);
    return {
      affectedRows: result.affectedRows ?? 0,
      insertId: result.insertId ? String(result.insertId) : null,
    };
  });
}

export async function updateManagerRow(
  databaseId: string,
  serverId: string,
  table: string,
  primaryKey: Record<string, unknown>,
  values: Record<string, unknown>,
  capabilities: DatabaseManagerCapabilities,
) {
  requireEdits(capabilities);
  return withUserConnection(databaseId, serverId, async (conn) => {
    const columns = await loadTableColumns(conn, table);
    const pkFields = primaryKeyFields(columns);
    if (!pkFields.length) {
      throw Object.assign(new Error('This table has no primary key, so rows cannot be edited safely'), {
        statusCode: 400,
      });
    }
    if (pkFields.some((f) => !(f in primaryKey))) {
      throw Object.assign(new Error('Primary key values are required'), { statusCode: 400 });
    }

    const setFields = Object.keys(values);
    if (!setFields.length) {
      throw Object.assign(new Error('No values provided'), { statusCode: 400 });
    }
    assertKnownFields(columns, [...setFields, ...Object.keys(primaryKey)]);

    const sql = `UPDATE ${quoteIdent(table)} SET ${setFields.map((f) => `${quoteIdent(f)} = ?`).join(', ')} WHERE ${pkFields
      .map((f) => `${quoteIdent(f)} = ?`)
      .join(' AND ')} LIMIT 1`;
    const params = [
      ...setFields.map((f) => normalizeSqlValue(values[f])),
      ...pkFields.map((f) => normalizeSqlValue(primaryKey[f])),
    ];
    const [result] = await conn.query<ResultSetHeader>(sql, params);
    return { affectedRows: result.affectedRows ?? 0 };
  });
}

export async function deleteManagerRow(
  databaseId: string,
  serverId: string,
  table: string,
  primaryKey: Record<string, unknown>,
  capabilities: DatabaseManagerCapabilities,
) {
  requireEdits(capabilities);
  return withUserConnection(databaseId, serverId, async (conn) => {
    const columns = await loadTableColumns(conn, table);
    const pkFields = primaryKeyFields(columns);
    if (!pkFields.length) {
      throw Object.assign(new Error('This table has no primary key, so rows cannot be deleted safely'), {
        statusCode: 400,
      });
    }
    if (pkFields.some((f) => !(f in primaryKey))) {
      throw Object.assign(new Error('Primary key values are required'), { statusCode: 400 });
    }
    assertKnownFields(columns, Object.keys(primaryKey));

    const sql = `DELETE FROM ${quoteIdent(table)} WHERE ${pkFields
      .map((f) => `${quoteIdent(f)} = ?`)
      .join(' AND ')} LIMIT 1`;
    const params = pkFields.map((f) => normalizeSqlValue(primaryKey[f]));
    const [result] = await conn.query<ResultSetHeader>(sql, params);
    return { affectedRows: result.affectedRows ?? 0 };
  });
}
