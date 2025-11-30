/**
 * MySQL Generator Tests
 */

import { describe, it, expect } from './test-runner.js';
import { Parser } from '../dist/ast/parser.js';
import { MySQLGenerator } from '../dist/generators/mysql.js';

describe('MySQLGenerator', () => {
  const generator = new MySQLGenerator();

  it('should generate CREATE TABLE with InnoDB engine', () => {
    const ast = Parser.parse(`model User { id Serial @pk }`);
    const sql = generator.generateUp(ast);

    expect(sql[0]).toContain('CREATE TABLE `User`');
    expect(sql[0]).toContain('ENGINE=InnoDB');
    expect(sql[0]).toContain('CHARSET=utf8mb4');
    expect(sql[0]).toContain('COLLATE=utf8mb4_unicode_ci');
  });

  it('should allow custom engine, charset, and collation', () => {
    const customGenerator = new MySQLGenerator({
      engine: 'MyISAM',
      charset: 'utf8',
      collation: 'utf8_general_ci'
    });
    const ast = Parser.parse(`model User { id Serial @pk }`);
    const sql = customGenerator.generateUp(ast);

    expect(sql[0]).toContain('ENGINE=MyISAM');
    expect(sql[0]).toContain('CHARSET=utf8');
    expect(sql[0]).toContain('COLLATE=utf8_general_ci');
  });

  it('should generate DROP TABLE statement', () => {
    const ast = Parser.parse(`model User { id Serial @pk }`);
    const sql = generator.generateDown(ast);

    expect(sql).toHaveLength(1);
    expect(sql[0]).toContain('DROP TABLE IF EXISTS `User`');
  });

  it('should map Serial to INT AUTO_INCREMENT', () => {
    const ast = Parser.parse(`model Test { id Serial @pk }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('INT AUTO_INCREMENT');
    expect(sql[0]).toContain('PRIMARY KEY');
  });

  it('should map Int to INT', () => {
    const ast = Parser.parse(`model Test { count Int }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('`count` INT');
  });

  it('should map BigInt to BIGINT', () => {
    const ast = Parser.parse(`model Test { bignum BigInt }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('BIGINT');
  });

  it('should map SmallInt to SMALLINT', () => {
    const ast = Parser.parse(`model Test { smallnum SmallInt }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('SMALLINT');
  });

  it('should map VarChar with length', () => {
    const ast = Parser.parse(`model Test { name VarChar(100) }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('VARCHAR(100)');
  });

  it('should default VarChar to 255', () => {
    const ast = Parser.parse(`model Test { name VarChar }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('VARCHAR(255)');
  });

  it('should map Text to TEXT', () => {
    const ast = Parser.parse(`model Test { bio Text }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('TEXT');
  });

  it('should map Boolean to BOOLEAN', () => {
    const ast = Parser.parse(`model Test { active Boolean }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('BOOLEAN');
  });

  it('should map Timestamp to TIMESTAMP', () => {
    const ast = Parser.parse(`model Test { created Timestamp }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('TIMESTAMP');
  });

  it('should map Date to DATE', () => {
    const ast = Parser.parse(`model Test { born Date }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('`born` DATE');
  });

  it('should map Time to TIME', () => {
    const ast = Parser.parse(`model Test { start Time }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('`start` TIME');
  });

  it('should map Decimal with precision and scale', () => {
    const ast = Parser.parse(`model Test { price Decimal(10, 2) }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('DECIMAL(10, 2)');
  });

  it('should map Real to FLOAT', () => {
    const ast = Parser.parse(`model Test { val Real }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('FLOAT');
  });

  it('should map DoublePrecision to DOUBLE', () => {
    const ast = Parser.parse(`model Test { val DoublePrecision }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('DOUBLE');
  });

  it('should map Json to JSON', () => {
    const ast = Parser.parse(`model Test { data Json }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('JSON');
  });

  it('should map Jsonb to JSON (MySQL has no JSONB)', () => {
    const ast = Parser.parse(`model Test { data Jsonb }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('JSON');
  });

  it('should map Uuid to CHAR(36)', () => {
    const ast = Parser.parse(`model Test { id Uuid }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('CHAR(36)');
  });

  it('should generate native ENUM type', () => {
    const ast = Parser.parse(`model User { role Enum(admin, user) }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain("ENUM('admin', 'user')");
  });

  it('should generate UNIQUE constraint', () => {
    const ast = Parser.parse(`model User { email VarChar(255) @unique }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('UNIQUE');
  });

  it('should generate NOT NULL constraint', () => {
    const ast = Parser.parse(`model User { name VarChar(100) @notnull }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('NOT NULL');
  });

  it('should generate DEFAULT with string value', () => {
    const ast = Parser.parse(`model User { role VarChar(50) @default('guest') }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain("DEFAULT 'guest'");
  });

  it('should generate DEFAULT with numeric value', () => {
    const ast = Parser.parse(`model User { age Int @default(18) }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('DEFAULT 18');
  });

  it('should generate DEFAULT true as 1', () => {
    const ast = Parser.parse(`model User { active Boolean @default(true) }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('DEFAULT 1');
  });

  it('should generate DEFAULT false as 0', () => {
    const ast = Parser.parse(`model User { active Boolean @default(false) }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('DEFAULT 0');
  });

  it('should generate DEFAULT now() as CURRENT_TIMESTAMP', () => {
    const ast = Parser.parse(`model User { created Timestamp @default(now) }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('DEFAULT CURRENT_TIMESTAMP');
  });

  it('should generate FOREIGN KEY constraint', () => {
    const ast = Parser.parse(`model Post { author_id Int @ref(User.id) }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('FOREIGN KEY (`author_id`) REFERENCES `User`(`id`)');
  });

  it('should generate FOREIGN KEY with ON DELETE CASCADE', () => {
    const ast = Parser.parse(`model Post { author_id Int @ref(User.id) @onDelete(CASCADE) }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('ON DELETE CASCADE');
  });

  it('should include raw SQL statements', () => {
    const ast = Parser.parse(`model User { id Serial @pk }
> CREATE INDEX idx_user ON User(id);`);
    const sql = generator.generateUp(ast);
    expect(sql).toHaveLength(2);
    expect(sql[1]).toContain('CREATE INDEX');
  });

  it('should generate DROP TABLE in reverse order', () => {
    const ast = Parser.parse(`model User { id Serial @pk }
model Post { id Serial @pk }
model Comment { id Serial @pk }`);
    const sql = generator.generateDown(ast);

    expect(sql).toHaveLength(3);
    expect(sql[0]).toContain('`Comment`');
    expect(sql[1]).toContain('`Post`');
    expect(sql[2]).toContain('`User`');
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

  it('should use backticks for MySQL identifiers', () => {
    const ast = Parser.parse(`model UserTable { user_name VarChar(100) }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('`UserTable`');
    expect(sql[0]).toContain('`user_name`');
  });

  it('should handle multiple decorators on same column', () => {
    const ast = Parser.parse(`model User { email VarChar(255) @unique @notnull }`);
    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('UNIQUE');
    expect(sql[0]).toContain('NOT NULL');
  });

  it('should put PRIMARY KEY after AUTO_INCREMENT', () => {
    const ast = Parser.parse(`model User { id Serial @pk }`);
    const sql = generator.generateUp(ast);
    // Check the order - AUTO_INCREMENT comes before PRIMARY KEY
    const autoIncrementIdx = sql[0].indexOf('AUTO_INCREMENT');
    const primaryKeyIdx = sql[0].indexOf('PRIMARY KEY');
    expect(autoIncrementIdx).toBeLessThan(primaryKeyIdx);
  });
});
