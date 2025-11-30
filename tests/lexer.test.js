/**
 * Lexer Tests
 */

import { describe, it, expect } from './test-runner.js';
import { Lexer } from '../dist/ast/lexer.js';

describe('Lexer', () => {
  it('should tokenize an empty string', () => {
    const lexer = new Lexer('');
    const tokens = lexer.tokenize();
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe('EOF');
  });

  it('should tokenize a simple model', () => {
    const input = `model User {
  id Serial @pk
}`;
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();

    expect(tokens.find(t => t.type === 'MODEL')).toBeDefined();
    expect(tokens.find(t => t.type === 'IDENTIFIER' && t.value === 'User')).toBeDefined();
    expect(tokens.find(t => t.type === 'LBRACE')).toBeDefined();
    expect(tokens.find(t => t.type === 'IDENTIFIER' && t.value === 'id')).toBeDefined();
    expect(tokens.find(t => t.type === 'TYPE' && t.value === 'Serial')).toBeDefined();
    expect(tokens.find(t => t.type === 'DECORATOR' && t.value === 'pk')).toBeDefined();
    expect(tokens.find(t => t.type === 'RBRACE')).toBeDefined();
  });

  it('should tokenize all data types', () => {
    const types = [
      'Serial', 'Int', 'BigInt', 'SmallInt', 'VarChar', 'Char', 'Text',
      'Boolean', 'Timestamp', 'Date', 'Time', 'Decimal', 'Numeric',
      'Real', 'DoublePrecision', 'Json', 'Jsonb', 'Uuid', 'Enum'
    ];

    for (const type of types) {
      const lexer = new Lexer(`model Test { col ${type} }`);
      const tokens = lexer.tokenize();
      const typeToken = tokens.find(t => t.type === 'TYPE' && t.value === type);
      expect(typeToken).toBeDefined();
    }
  });

  it('should tokenize decorators with arguments', () => {
    const input = `model User {
  role Enum(admin, user) @default(user)
}`;
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();

    expect(tokens.find(t => t.type === 'DECORATOR' && t.value === 'default')).toBeDefined();
    expect(tokens.filter(t => t.type === 'LPAREN')).toHaveLength(2);
    expect(tokens.filter(t => t.type === 'RPAREN')).toHaveLength(2);
  });

  it('should handle comments', () => {
    const input = `# This is a comment
model User {
  id Serial @pk # Inline comment
}`;
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();

    // Comments should be ignored
    const commentTokens = tokens.filter(t => t.type === 'COMMENT');
    expect(commentTokens).toHaveLength(0);
  });

  it('should tokenize raw SQL', () => {
    const input = `model User { id Serial @pk }
> CREATE INDEX idx_user ON "User"(id);`;
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();

    const rawSqlToken = tokens.find(t => t.type === 'RAW_SQL');
    expect(rawSqlToken).toBeDefined();
    expect(rawSqlToken.value).toContain('CREATE INDEX');
  });

  it('should tokenize strings with single quotes', () => {
    const input = `model User { name VarChar @default('guest') }`;
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();

    const stringToken = tokens.find(t => t.type === 'STRING');
    expect(stringToken).toBeDefined();
    expect(stringToken.value).toBe('guest');
  });

  it('should tokenize strings with double quotes', () => {
    const input = `model User { name VarChar @default("guest") }`;
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();

    const stringToken = tokens.find(t => t.type === 'STRING');
    expect(stringToken).toBeDefined();
    expect(stringToken.value).toBe('guest');
  });

  it('should tokenize escape sequences in strings', () => {
    const input = `model User { bio Text @default('Line1\\nLine2') }`;
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();

    const stringToken = tokens.find(t => t.type === 'STRING');
    expect(stringToken).toBeDefined();
    expect(stringToken.value).toBe('Line1\nLine2');
  });

  it('should tokenize numbers', () => {
    const input = `model Product { price Decimal(10, 2) }`;
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();

    const numberTokens = tokens.filter(t => t.type === 'NUMBER');
    expect(numberTokens).toHaveLength(2);
    expect(numberTokens[0].value).toBe('10');
    expect(numberTokens[1].value).toBe('2');
  });

  it('should tokenize decimal numbers', () => {
    const input = `model Test { val Int @default(3.14) }`;
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();

    const numberToken = tokens.find(t => t.type === 'NUMBER' && t.value === '3.14');
    expect(numberToken).toBeDefined();
  });

  it('should track line and column numbers', () => {
    const input = `model User {
  id Serial
}`;
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();

    const modelToken = tokens.find(t => t.type === 'MODEL');
    expect(modelToken.line).toBe(1);

    const idToken = tokens.find(t => t.type === 'IDENTIFIER' && t.value === 'id');
    expect(idToken.line).toBe(2);
  });

  it('should throw error for unterminated string', () => {
    const input = `model User { name VarChar @default('unterminated }`;

    expect(() => {
      const lexer = new Lexer(input);
      lexer.tokenize();
    }).toThrow('Unterminated string');
  });

  it('should throw error for unexpected characters', () => {
    const input = `model User { id Serial $ }`;

    expect(() => {
      const lexer = new Lexer(input);
      lexer.tokenize();
    }).toThrow('Unexpected character');
  });

  it('should throw error for empty decorator name', () => {
    const input = `model User { id Serial @ }`;

    expect(() => {
      const lexer = new Lexer(input);
      lexer.tokenize();
    }).toThrow('Expected decorator name');
  });

  it('should tokenize dot notation for references', () => {
    const input = `model Post { author_id Int @ref(User.id) }`;
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();

    expect(tokens.find(t => t.type === 'DOT')).toBeDefined();
    expect(tokens.find(t => t.type === 'IDENTIFIER' && t.value === 'User')).toBeDefined();
  });

  it('should handle multiple models', () => {
    const input = `model User { id Serial @pk }
model Post { id Serial @pk }`;
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();

    const modelTokens = tokens.filter(t => t.type === 'MODEL');
    expect(modelTokens).toHaveLength(2);
  });

  it('should tokenize comma', () => {
    const input = `model User { role Enum(admin, user, guest) }`;
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();

    const commaTokens = tokens.filter(t => t.type === 'COMMA');
    expect(commaTokens).toHaveLength(2);
  });
});
