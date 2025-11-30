/**
 * Integration Tests
 * Tests end-to-end parsing and generation
 */

import { describe, it, expect } from './test-runner.js';
import { Parser } from '../dist/ast/parser.js';
import { PostgresGenerator } from '../dist/generators/postgres.js';
import { MySQLGenerator } from '../dist/generators/mysql.js';
import { SQLiteGenerator } from '../dist/generators/sqlite.js';

describe('Integration: Full Schema Parsing and Generation', () => {
  const schemactSchema = `
# User management model
model User {
  id Serial @pk
  username VarChar(50) @unique @notnull
  email VarChar(255) @unique @notnull
  password VarChar(255) @notnull
  firstName VarChar(100)
  lastName VarChar(100)
  bio Text
  role Enum(admin, author, reader) @default(reader)
  isActive Boolean @default(true)
  createdAt Timestamp @default(now)
  updatedAt Timestamp
}

# Blog post model
model Post {
  id Serial @pk
  title VarChar(255) @notnull
  slug VarChar(255) @unique @notnull
  content Text @notnull
  excerpt VarChar(500)
  authorId Int @ref(User.id) @onDelete(CASCADE)
  status Enum(draft, published, archived) @default(draft)
  viewCount Int @default(0)
  publishedAt Timestamp
  createdAt Timestamp @default(now)
  updatedAt Timestamp
}

# Raw SQL indexes
> CREATE INDEX idx_posts_author ON "Post"("authorId");
> CREATE INDEX idx_posts_status ON "Post"("status");
`;

  it('should parse complex schema successfully', () => {
    const ast = Parser.parse(schemactSchema);

    expect(ast.models).toHaveLength(2);
    expect(ast.rawSql).toHaveLength(2);

    // User model
    const user = ast.models.find(m => m.name === 'User');
    expect(user).toBeDefined();
    expect(user.columns).toHaveLength(11);

    // Post model
    const post = ast.models.find(m => m.name === 'Post');
    expect(post).toBeDefined();
    expect(post.columns).toHaveLength(11);
  });

  it('should generate valid PostgreSQL DDL', () => {
    const ast = Parser.parse(schemactSchema);
    const generator = new PostgresGenerator();

    const upSql = generator.generateUp(ast);
    const downSql = generator.generateDown(ast);

    // UP migration
    expect(upSql).toHaveLength(4); // 2 tables + 2 raw SQL
    expect(upSql[0]).toContain('CREATE TABLE "User"');
    expect(upSql[0]).toContain('"id" SERIAL PRIMARY KEY');
    expect(upSql[0]).toContain('DEFAULT CURRENT_TIMESTAMP');
    expect(upSql[1]).toContain('CREATE TABLE "Post"');
    expect(upSql[1]).toContain('FOREIGN KEY ("authorId") REFERENCES "User"("id")');
    expect(upSql[1]).toContain('ON DELETE CASCADE');

    // DOWN migration
    expect(downSql).toHaveLength(2);
    expect(downSql[0]).toContain('DROP TABLE IF EXISTS "Post" CASCADE');
    expect(downSql[1]).toContain('DROP TABLE IF EXISTS "User" CASCADE');
  });

  it('should generate valid MySQL DDL', () => {
    const ast = Parser.parse(schemactSchema);
    const generator = new MySQLGenerator();

    const upSql = generator.generateUp(ast);
    const downSql = generator.generateDown(ast);

    // UP migration
    expect(upSql).toHaveLength(4);
    expect(upSql[0]).toContain('CREATE TABLE `User`');
    expect(upSql[0]).toContain('INT AUTO_INCREMENT');
    expect(upSql[0]).toContain("ENUM('admin', 'author', 'reader')");
    expect(upSql[0]).toContain('ENGINE=InnoDB');
    expect(upSql[1]).toContain('CREATE TABLE `Post`');
    expect(upSql[1]).toContain('FOREIGN KEY (`authorId`) REFERENCES `User`(`id`)');

    // DOWN migration
    expect(downSql).toHaveLength(2);
    expect(downSql[0]).toContain('DROP TABLE IF EXISTS `Post`');
    expect(downSql[1]).toContain('DROP TABLE IF EXISTS `User`');
  });

  it('should generate valid SQLite DDL', () => {
    const ast = Parser.parse(schemactSchema);
    const generator = new SQLiteGenerator();

    const upSql = generator.generateUp(ast);
    const downSql = generator.generateDown(ast);

    // UP migration
    expect(upSql).toHaveLength(5); // PRAGMA + 2 tables + 2 raw SQL
    expect(upSql[0]).toBe('PRAGMA foreign_keys = ON;');
    expect(upSql[1]).toContain('CREATE TABLE "User"');
    expect(upSql[1]).toContain('INTEGER PRIMARY KEY AUTOINCREMENT');
    expect(upSql[1]).toContain('CHECK ("role" IN');
    expect(upSql[2]).toContain('CREATE TABLE "Post"');

    // DOWN migration
    expect(downSql).toHaveLength(3); // PRAGMA + 2 DROP TABLEs
    expect(downSql[0]).toBe('PRAGMA foreign_keys = ON;');
  });
});

describe('Integration: E-Commerce Schema', () => {
  const ecommerceSchema = `
model Category {
  id Serial @pk
  name VarChar(100) @notnull
  slug VarChar(100) @unique @notnull
  parentId Int @ref(Category.id) @onDelete('SET NULL')
  createdAt Timestamp @default(now)
}

model Product {
  id Serial @pk
  name VarChar(255) @notnull
  sku VarChar(50) @unique @notnull
  price Decimal(10, 2) @notnull
  stock Int @default(0)
  categoryId Int @ref(Category.id) @onDelete('SET NULL')
  description Text
  isActive Boolean @default(true)
  createdAt Timestamp @default(now)
}

model Customer {
  id Serial @pk
  email VarChar(255) @unique @notnull
  passwordHash VarChar(255) @notnull
  firstName VarChar(100)
  lastName VarChar(100)
  phone VarChar(20)
  createdAt Timestamp @default(now)
}

model Order {
  id Serial @pk
  customerId Int @ref(Customer.id) @onDelete(RESTRICT)
  status Enum(pending, processing, shipped, delivered, cancelled) @default(pending)
  totalAmount Decimal(10, 2) @notnull
  shippingAddress Text @notnull
  createdAt Timestamp @default(now)
  updatedAt Timestamp
}

model OrderItem {
  id Serial @pk
  orderId Int @ref(Order.id) @onDelete(CASCADE)
  productId Int @ref(Product.id) @onDelete(RESTRICT)
  quantity Int @notnull
  unitPrice Decimal(10, 2) @notnull
  createdAt Timestamp @default(now)
}
`;

  it('should parse e-commerce schema', () => {
    const ast = Parser.parse(ecommerceSchema);

    expect(ast.models).toHaveLength(5);

    const modelNames = ast.models.map(m => m.name);
    expect(modelNames).toContain('Category');
    expect(modelNames).toContain('Product');
    expect(modelNames).toContain('Customer');
    expect(modelNames).toContain('Order');
    expect(modelNames).toContain('OrderItem');
  });

  it('should handle self-referencing foreign keys', () => {
    const ast = Parser.parse(ecommerceSchema);
    const generator = new PostgresGenerator();

    const sql = generator.generateUp(ast);
    const categorySql = sql[0];

    expect(categorySql).toContain('FOREIGN KEY ("parentId") REFERENCES "Category"("id")');
    expect(categorySql).toContain('ON DELETE SET NULL');
  });

  it('should handle multiple foreign keys in one table', () => {
    const ast = Parser.parse(ecommerceSchema);
    const generator = new PostgresGenerator();

    const sql = generator.generateUp(ast);
    const orderItemSql = sql[4];

    expect(orderItemSql).toContain('FOREIGN KEY ("orderId") REFERENCES "Order"("id")');
    expect(orderItemSql).toContain('FOREIGN KEY ("productId") REFERENCES "Product"("id")');
  });

  it('should generate correct DROP order for dependencies', () => {
    const ast = Parser.parse(ecommerceSchema);
    const generator = new PostgresGenerator();

    const sql = generator.generateDown(ast);

    // OrderItem depends on Order and Product, so should be dropped first
    expect(sql[0]).toContain('"OrderItem"');
    expect(sql[1]).toContain('"Order"');
    expect(sql[2]).toContain('"Customer"');
    expect(sql[3]).toContain('"Product"');
    expect(sql[4]).toContain('"Category"');
  });
});

describe('Integration: Edge Cases', () => {
  it('should handle model with only primary key', () => {
    const schema = `model Simple { id Serial @pk }`;
    const ast = Parser.parse(schema);
    const generator = new PostgresGenerator();

    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('CREATE TABLE "Simple"');
    expect(sql[0]).toContain('"id" SERIAL PRIMARY KEY');
  });

  it('should handle all decorator combinations', () => {
    const schema = `model AllDecorators {
  id Serial @pk
  email VarChar(255) @unique @notnull
  role Enum(admin, user) @default(user) @notnull
  authorId Int @ref(User.id) @onDelete(CASCADE)
}`;
    const ast = Parser.parse(schema);
    const generator = new PostgresGenerator();

    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('PRIMARY KEY');
    expect(sql[0]).toContain('UNIQUE');
    expect(sql[0]).toContain('NOT NULL');
    expect(sql[0]).toContain('DEFAULT');
    expect(sql[0]).toContain('FOREIGN KEY');
    expect(sql[0]).toContain('ON DELETE CASCADE');
  });

  it('should handle all onDelete actions', () => {
    // Actions with spaces need to be quoted in the DSL
    const testCases = [
      { dsl: 'CASCADE', expected: 'CASCADE' },
      { dsl: "'SET NULL'", expected: 'SET NULL' },
      { dsl: 'RESTRICT', expected: 'RESTRICT' },
      { dsl: "'NO ACTION'", expected: 'NO ACTION' },
    ];

    for (const { dsl, expected } of testCases) {
      const schema = `model Test { refId Int @ref(Other.id) @onDelete(${dsl}) }`;
      const ast = Parser.parse(schema);
      const generator = new PostgresGenerator();

      const sql = generator.generateUp(ast);
      expect(sql[0]).toContain(`ON DELETE ${expected}`);
    }
  });

  it('should handle empty raw SQL array', () => {
    const schema = `model Test { id Serial @pk }`;
    const ast = Parser.parse(schema);

    expect(ast.rawSql).toHaveLength(0);
  });

  it('should handle decimal without arguments', () => {
    const schema = `model Test { price Decimal }`;
    const ast = Parser.parse(schema);
    const generator = new PostgresGenerator();

    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('NUMERIC(10, 2)');
  });

  it('should handle Char without arguments', () => {
    const schema = `model Test { code Char }`;
    const ast = Parser.parse(schema);
    const generator = new PostgresGenerator();

    const sql = generator.generateUp(ast);
    expect(sql[0]).toContain('CHAR(1)');
  });
});

describe('Integration: Multi-Generator Comparison', () => {
  const schema = `model Test {
  id Serial @pk
  name VarChar(100) @notnull
  active Boolean @default(true)
  role Enum(admin, user) @default(user)
  ref Int @ref(Other.id) @onDelete(CASCADE)
}`;

  it('should generate different SQL for each database', () => {
    const ast = Parser.parse(schema);

    const postgres = new PostgresGenerator().generateUp(ast);
    const mysql = new MySQLGenerator().generateUp(ast);
    const sqlite = new SQLiteGenerator().generateUp(ast);

    // PostgreSQL specifics
    expect(postgres[0]).toContain('SERIAL');
    expect(postgres[0]).toContain('CHECK');
    expect(postgres[0]).toContain('DEFAULT true');

    // MySQL specifics
    expect(mysql[0]).toContain('AUTO_INCREMENT');
    expect(mysql[0]).toContain('ENUM(');
    expect(mysql[0]).toContain('DEFAULT 1');
    expect(mysql[0]).toContain('ENGINE=InnoDB');

    // SQLite specifics
    expect(sqlite[0]).toBe('PRAGMA foreign_keys = ON;');
    expect(sqlite[1]).toContain('AUTOINCREMENT');
    expect(sqlite[1]).toContain('CHECK');
    expect(sqlite[1]).toContain('DEFAULT 1');
  });

  it('should use different identifier quoting', () => {
    const ast = Parser.parse(schema);

    const postgres = new PostgresGenerator().generateUp(ast);
    const mysql = new MySQLGenerator().generateUp(ast);
    const sqlite = new SQLiteGenerator().generateUp(ast);

    // PostgreSQL uses double quotes
    expect(postgres[0]).toContain('"Test"');
    expect(postgres[0]).toContain('"name"');

    // MySQL uses backticks
    expect(mysql[0]).toContain('`Test`');
    expect(mysql[0]).toContain('`name`');

    // SQLite uses double quotes (like PostgreSQL)
    expect(sqlite[1]).toContain('"Test"');
    expect(sqlite[1]).toContain('"name"');
  });
});
