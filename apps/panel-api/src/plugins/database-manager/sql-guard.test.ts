import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifySql, quoteIdent, splitSqlStatements, stripLeadingSqlNoise } from './sql-guard.js';

describe('database-manager sql-guard', () => {
  it('classifies read statements', () => {
    assert.equal(classifySql('SELECT * FROM users').kind, 'read');
    assert.equal(classifySql('  show tables').kind, 'read');
    assert.equal(classifySql('DESCRIBE accounts').kind, 'read');
  });

  it('classifies write statements', () => {
    assert.equal(classifySql('INSERT INTO t VALUES (1)').kind, 'write');
    assert.equal(classifySql('UPDATE t SET a=1').kind, 'write');
    assert.equal(classifySql('DELETE FROM t').kind, 'write');
  });

  it('blocks ddl multi-statement and comments by default', () => {
    assert.equal(classifySql('DROP TABLE t').kind, 'blocked');
    assert.equal(classifySql('SELECT 1; SELECT 2').kind, 'blocked');
    assert.equal(classifySql('SELECT /*x*/ 1').kind, 'blocked');
    assert.equal(classifySql('-- evil\nSELECT 1').kind, 'blocked');
  });

  it('allows ddl in import mode', () => {
    assert.equal(classifySql('CREATE TABLE t (id INT)', { allowDdl: true }).kind, 'ddl');
    assert.equal(classifySql('DROP TABLE t', { allowDdl: true }).kind, 'ddl');
  });

  it('quotes identifiers safely', () => {
    assert.equal(quoteIdent('users'), '`users`');
    assert.equal(quoteIdent('weird`name'), '`weird``name`');
  });

  it('splits scripts with quotes and comments', () => {
    const stmts = splitSqlStatements(`
      -- header
      INSERT INTO t VALUES ('a;b');
      /* block */
      UPDATE t SET x = "c;d" WHERE id = 1;
    `);
    assert.equal(stmts.length, 2);
    assert.match(stripLeadingSqlNoise(stmts[0]), /^INSERT/i);
    assert.match(stripLeadingSqlNoise(stmts[1]), /^UPDATE/i);
  });

  it('strips leading noise', () => {
    assert.equal(stripLeadingSqlNoise('-- x\nSELECT 1'), 'SELECT 1');
  });
});
