/**
 * Parser Tests
 */

import { describe, it, expect } from './test-runner.js';
import { Parser } from '../dist/ast/parser.js';

describe('Parser', () => {
  it('should parse an empty schema', () => {
    const ast = Parser.parse('');
    expect(ast.models).toHaveLength(0);
    expect(ast.rawSql).toHaveLength(0);
  });

  it('should parse a simple model', () => {
    const input = `model User {
  id Serial @pk
}`;
    const ast = Parser.parse(input);

    expect(ast.models).toHaveLength(1);
    expect(ast.models[0].name).toBe('User');
    expect(ast.models[0].columns).toHaveLength(1);
    expect(ast.models[0].columns[0].name).toBe('id');
    expect(ast.models[0].columns[0].type).toBe('Serial');
  });

  it('should parse column decorators', () => {
    const input = `model User {
  id Serial @pk
  email VarChar(255) @unique @notnull
}`;
    const ast = Parser.parse(input);

    const emailColumn = ast.models[0].columns.find(c => c.name === 'email');
    expect(emailColumn.decorators).toHaveLength(2);
    expect(emailColumn.decorators[0].name).toBe('unique');
    expect(emailColumn.decorators[1].name).toBe('notnull');
  });

  it('should parse decorator with arguments', () => {
    const input = `model User {
  role Enum(admin, user) @default(user)
}`;
    const ast = Parser.parse(input);

    const roleColumn = ast.models[0].columns[0];
    expect(roleColumn.typeArgs).toEqual(['admin', 'user']);

    const defaultDecorator = roleColumn.decorators.find(d => d.name === 'default');
    expect(defaultDecorator.args).toEqual(['user']);
  });

  it('should parse type arguments', () => {
    const input = `model Product {
  price Decimal(10, 2)
  name VarChar(100)
}`;
    const ast = Parser.parse(input);

    const priceColumn = ast.models[0].columns.find(c => c.name === 'price');
    expect(priceColumn.typeArgs).toEqual(['10', '2']);

    const nameColumn = ast.models[0].columns.find(c => c.name === 'name');
    expect(nameColumn.typeArgs).toEqual(['100']);
  });

  it('should parse raw SQL statements', () => {
    const input = `model User { id Serial @pk }
> CREATE INDEX idx_user ON "User"(id);
> CREATE INDEX idx_email ON "User"(email);`;
    const ast = Parser.parse(input);

    expect(ast.rawSql).toHaveLength(2);
    expect(ast.rawSql[0].sql).toContain('CREATE INDEX idx_user');
    expect(ast.rawSql[1].sql).toContain('CREATE INDEX idx_email');
  });

  it('should parse foreign key references', () => {
    const input = `model Post {
  author_id Int @ref(User.id) @onDelete(CASCADE)
}`;
    const ast = Parser.parse(input);

    const authorColumn = ast.models[0].columns[0];
    const refDecorator = authorColumn.decorators.find(d => d.name === 'ref');
    expect(refDecorator.args).toEqual(['User.id']);

    const onDeleteDecorator = authorColumn.decorators.find(d => d.name === 'onDelete');
    expect(onDeleteDecorator.args).toEqual(['CASCADE']);
  });

  it('should parse multiple models', () => {
    const input = `model User {
  id Serial @pk
  name VarChar(100)
}

model Post {
  id Serial @pk
  title VarChar(255)
}

model Comment {
  id Serial @pk
  content Text
}`;
    const ast = Parser.parse(input);

    expect(ast.models).toHaveLength(3);
    expect(ast.models[0].name).toBe('User');
    expect(ast.models[1].name).toBe('Post');
    expect(ast.models[2].name).toBe('Comment');
  });

  it('should parse string default values', () => {
    const input = `model User {
  role VarChar(50) @default('guest')
}`;
    const ast = Parser.parse(input);

    const roleColumn = ast.models[0].columns[0];
    const defaultDecorator = roleColumn.decorators.find(d => d.name === 'default');
    expect(defaultDecorator.args).toEqual(['guest']);
  });

  it('should throw error for empty model', () => {
    const input = `model User {
}`;
    expect(() => Parser.parse(input)).toThrow('must have at least one column');
  });

  it('should throw error for missing model name', () => {
    const input = `model {
  id Serial @pk
}`;
    expect(() => Parser.parse(input)).toThrow();
  });

  it('should throw error for missing column type', () => {
    const input = `model User {
  id @pk
}`;
    expect(() => Parser.parse(input)).toThrow();
  });

  it('should throw error for unclosed brace', () => {
    const input = `model User {
  id Serial @pk`;
    expect(() => Parser.parse(input)).toThrow();
  });

  it('should throw error for duplicate decorators', () => {
    const input = `model User {
  id Serial @pk @pk
}`;
    expect(() => Parser.parse(input)).toThrow('Duplicate decorator');
  });

  it('should parse model with all common column types', () => {
    const input = `model AllTypes {
  id Serial @pk
  intCol Int
  bigIntCol BigInt
  smallIntCol SmallInt
  varcharCol VarChar(255)
  charCol Char(10)
  textCol Text
  boolCol Boolean
  timestampCol Timestamp
  dateCol Date
  timeCol Time
  decimalCol Decimal(10, 2)
  numericCol Numeric(5, 3)
  realCol Real
  doubleCol DoublePrecision
  jsonCol Json
  jsonbCol Jsonb
  uuidCol Uuid
  enumCol Enum(a, b, c)
}`;
    const ast = Parser.parse(input);

    expect(ast.models[0].columns).toHaveLength(19);
  });

  it('should parse enum with string values', () => {
    const input = `model User {
  status Enum('active', 'inactive', 'pending')
}`;
    const ast = Parser.parse(input);

    const statusColumn = ast.models[0].columns[0];
    expect(statusColumn.typeArgs).toEqual(['active', 'inactive', 'pending']);
  });

  it('should handle comments before model', () => {
    const input = `# User model
model User {
  id Serial @pk
}`;
    const ast = Parser.parse(input);
    expect(ast.models).toHaveLength(1);
  });

  it('should handle inline comments', () => {
    const input = `model User {
  id Serial @pk # Primary key
  name VarChar(100) # User name
}`;
    const ast = Parser.parse(input);
    expect(ast.models[0].columns).toHaveLength(2);
  });

  it('should throw error for unexpected token', () => {
    const input = `@decorator
model User {
  id Serial @pk
}`;
    expect(() => Parser.parse(input)).toThrow('Unexpected token');
  });
});
