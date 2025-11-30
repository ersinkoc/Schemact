/**
 * SQLite Generator Tests
 */

import { describe, it, expect } from './test-runner.js';
import { Parser } from '../dist/ast/parser.js';
import { SQLiteGenerator } from '../dist/generators/sqlite.js';

describe('SQLiteGenerator', () => {
  const generator = new SQLiteGenerator();

  it('should generate PRAGMA and CREATE TABLE', () => {
    const ast = Parser.parse(`model User { id Serial @pk }`);
    const sql = generator.generateUp(ast);

    expect(sql).toHaveLength(2);
    expect(sql[0]).toBe('PRAGMA foreign_keys = ON;');
    expect(sql[1]).toContain('CREATE TABLE "User"');
  });

  it('should generate PRAGMA and DROP TABLE', () => {
    const ast = Parser.parse(`model User { id Serial @pk }`);
    const sql = generator.generateDown(ast);

    expect(sql).toHaveLength(2);
    expect(sql[0]).toBe('PRAGMA foreign_keys = ON;');
    expect(sql[1]).toContain('DROP TABLE IF EXISTS "User"');
  });

  it('should map Serial to INTEGER PRIMARY KEY AUTOINCREMENT', () => {
    const ast = Parser.parse(`model Test { id Serial @pk }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('INTEGER PRIMARY KEY AUTOINCREMENT');
  });

  it('should map Int to INTEGER', () => {
    const ast = Parser.parse(`model Test { count Int }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('INTEGER');
  });

  it('should map BigInt to INTEGER', () => {
    const ast = Parser.parse(`model Test { bignum BigInt }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('INTEGER');
  });

  it('should map SmallInt to INTEGER', () => {
    const ast = Parser.parse(`model Test { smallnum SmallInt }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('INTEGER');
  });

  it('should map VarChar to TEXT', () => {
    const ast = Parser.parse(`model Test { name VarChar(100) }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('TEXT');
  });

  it('should map Char to TEXT', () => {
    const ast = Parser.parse(`model Test { code Char(10) }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('TEXT');
  });

  it('should map Text to TEXT', () => {
    const ast = Parser.parse(`model Test { bio Text }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('TEXT');
  });

  it('should map Boolean to INTEGER', () => {
    const ast = Parser.parse(`model Test { active Boolean }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('INTEGER');
  });

  it('should map Timestamp to TEXT', () => {
    const ast = Parser.parse(`model Test { created Timestamp }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('"created" TEXT');
  });

  it('should map Date to TEXT', () => {
    const ast = Parser.parse(`model Test { born Date }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('"born" TEXT');
  });

  it('should map Time to TEXT', () => {
    const ast = Parser.parse(`model Test { start Time }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('"start" TEXT');
  });

  it('should map Decimal to REAL', () => {
    const ast = Parser.parse(`model Test { price Decimal(10, 2) }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('REAL');
  });

  it('should map Real to REAL', () => {
    const ast = Parser.parse(`model Test { val Real }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('REAL');
  });

  it('should map DoublePrecision to REAL', () => {
    const ast = Parser.parse(`model Test { val DoublePrecision }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('REAL');
  });

  it('should map Json to TEXT', () => {
    const ast = Parser.parse(`model Test { data Json }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('TEXT');
  });

  it('should map Jsonb to TEXT', () => {
    const ast = Parser.parse(`model Test { data Jsonb }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('TEXT');
  });

  it('should map Uuid to TEXT', () => {
    const ast = Parser.parse(`model Test { id Uuid }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('TEXT');
  });

  it('should generate Enum as TEXT with CHECK constraint', () => {
    const ast = Parser.parse(`model User { role Enum(admin, user) }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('TEXT');
    expect(sql[1]).toContain('CHECK');
    expect(sql[1]).toContain("'admin'");
    expect(sql[1]).toContain("'user'");
  });

  it('should generate UNIQUE constraint', () => {
    const ast = Parser.parse(`model User { email VarChar(255) @unique }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('UNIQUE');
  });

  it('should generate NOT NULL constraint', () => {
    const ast = Parser.parse(`model User { name VarChar(100) @notnull }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('NOT NULL');
  });

  it('should generate DEFAULT with string value', () => {
    const ast = Parser.parse(`model User { role VarChar(50) @default('guest') }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain("DEFAULT 'guest'");
  });

  it('should generate DEFAULT with numeric value', () => {
    const ast = Parser.parse(`model User { age Int @default(18) }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('DEFAULT 18');
  });

  it('should generate DEFAULT true as 1', () => {
    const ast = Parser.parse(`model User { active Boolean @default(true) }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('DEFAULT 1');
  });

  it('should generate DEFAULT false as 0', () => {
    const ast = Parser.parse(`model User { active Boolean @default(false) }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('DEFAULT 0');
  });

  it('should generate DEFAULT now() as CURRENT_TIMESTAMP', () => {
    const ast = Parser.parse(`model User { created Timestamp @default(now) }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('DEFAULT CURRENT_TIMESTAMP');
  });

  it('should generate FOREIGN KEY constraint', () => {
    const ast = Parser.parse(`model Post { author_id Int @ref(User.id) }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('FOREIGN KEY ("author_id") REFERENCES "User"("id")');
  });

  it('should generate FOREIGN KEY with ON DELETE CASCADE', () => {
    const ast = Parser.parse(`model Post { author_id Int @ref(User.id) @onDelete(CASCADE) }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('ON DELETE CASCADE');
  });

  it('should include raw SQL statements', () => {
    const ast = Parser.parse(`model User { id Serial @pk }
> CREATE INDEX idx_user ON "User"(id);`);
    const sql = generator.generateUp(ast);
    expect(sql).toHaveLength(3);
    expect(sql[2]).toContain('CREATE INDEX');
  });

  it('should generate DROP TABLE in reverse order', () => {
    const ast = Parser.parse(`model User { id Serial @pk }
model Post { id Serial @pk }
model Comment { id Serial @pk }`);
    const sql = generator.generateDown(ast);

    expect(sql).toHaveLength(4); // PRAGMA + 3 DROP TABLEs
    expect(sql[1]).toContain('"Comment"');
    expect(sql[2]).toContain('"Post"');
    expect(sql[3]).toContain('"User"');
  });

  it('should throw error for unknown type', () => {
    const ast = {
      models: [{
        name: 'Test',
        columns: [{
          name: 'col',
          type: 'UnknownType',
          decorators: []
        }]
      }],
      rawSql: []
    };
    expect(() => generator.generateUp(ast)).toThrow('Unknown type');
  });

  it('should throw error for unknown decorator', () => {
    const ast = {
      models: [{
        name: 'Test',
        columns: [{
          name: 'id',
          type: 'Int',
          decorators: [{ name: 'unknown' }]
        }]
      }],
      rawSql: []
    };
    expect(() => generator.generateUp(ast)).toThrow('Unknown decorator');
  });

  it('should use double quotes for SQLite identifiers', () => {
    const ast = Parser.parse(`model UserTable { user_name VarChar(100) }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('"UserTable"');
    expect(sql[1]).toContain('"user_name"');
  });

  it('should handle multiple decorators on same column', () => {
    const ast = Parser.parse(`model User { email VarChar(255) @unique @notnull }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('UNIQUE');
    expect(sql[1]).toContain('NOT NULL');
  });

  it('should add AUTOINCREMENT for Int with @pk', () => {
    const ast = Parser.parse(`model User { id Int @pk }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('PRIMARY KEY AUTOINCREMENT');
  });

  it('should not add AUTOINCREMENT for non-integer @pk', () => {
    const ast = Parser.parse(`model User { id Uuid @pk }`);
    const sql = generator.generateUp(ast);
    expect(sql[1]).toContain('PRIMARY KEY');
    expect(sql[1]).not.toContain('AUTOINCREMENT');
  });
});
