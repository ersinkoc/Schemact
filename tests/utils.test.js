/**
 * Utility Functions Tests
 */

import { describe, it, expect } from './test-runner.js';
import {
  escapeSqlIdentifier,
  escapePostgresIdentifier,
  escapeMySQLIdentifier,
  escapeSqlStringLiteral,
  MAX_IDENTIFIER_LENGTH_POSTGRES,
  MAX_IDENTIFIER_LENGTH_MYSQL,
  MAX_IDENTIFIER_LENGTH_SQLITE,
} from '../dist/utils/sql-identifier-escape.js';
import {
  formatDsl,
  generateMigrationFilename,
  createMigrationTemplate,
  formatTable,
  truncate,
  pluralize,
} from '../dist/utils/formatting.js';

describe('SQL Identifier Escaping', () => {
  it('should validate simple identifier', () => {
    const result = escapeSqlIdentifier('users');
    expect(result).toBe('users');
  });

  it('should validate identifier with underscore', () => {
    const result = escapeSqlIdentifier('user_name');
    expect(result).toBe('user_name');
  });

  it('should validate identifier with numbers', () => {
    const result = escapeSqlIdentifier('user123');
    expect(result).toBe('user123');
  });

  it('should validate identifier starting with underscore', () => {
    const result = escapeSqlIdentifier('_private');
    expect(result).toBe('_private');
  });

  it('should trim whitespace', () => {
    const result = escapeSqlIdentifier('  users  ');
    expect(result).toBe('users');
  });

  it('should throw for empty string', () => {
    expect(() => escapeSqlIdentifier('')).toThrow('non-empty string');
  });

  it('should throw for null', () => {
    expect(() => escapeSqlIdentifier(null)).toThrow('must be a non-empty string');
  });

  it('should throw for undefined', () => {
    expect(() => escapeSqlIdentifier(undefined)).toThrow('must be a non-empty string');
  });

  it('should throw for identifier starting with number', () => {
    expect(() => escapeSqlIdentifier('123users')).toThrow('must start with a letter or underscore');
  });

  it('should throw for dangerous characters - semicolon', () => {
    expect(() => escapeSqlIdentifier('users;drop')).toThrow('dangerous characters');
  });

  it('should throw for dangerous characters - single quote', () => {
    expect(() => escapeSqlIdentifier("users'test")).toThrow('dangerous characters');
  });

  it('should throw for dangerous characters - double quote', () => {
    expect(() => escapeSqlIdentifier('users"test')).toThrow('dangerous characters');
  });

  it('should throw for dangerous characters - backslash', () => {
    expect(() => escapeSqlIdentifier('users\\test')).toThrow('dangerous characters');
  });

  it('should throw for dangerous characters - slash', () => {
    expect(() => escapeSqlIdentifier('users/test')).toThrow('dangerous characters');
  });

  it('should throw for dangerous characters - asterisk', () => {
    expect(() => escapeSqlIdentifier('users*test')).toThrow('dangerous characters');
  });

  it('should throw for dangerous characters - hash', () => {
    expect(() => escapeSqlIdentifier('users#test')).toThrow('dangerous characters');
  });

  it('should throw for too long identifier', () => {
    const longName = 'a'.repeat(100);
    expect(() => escapeSqlIdentifier(longName)).toThrow('too long');
  });

  it('should allow identifier at max length', () => {
    const maxName = 'a'.repeat(MAX_IDENTIFIER_LENGTH_POSTGRES);
    const result = escapeSqlIdentifier(maxName);
    expect(result).toBe(maxName);
  });

  it('should use custom max length', () => {
    const longName = 'a'.repeat(100);
    const result = escapeSqlIdentifier(longName, 'identifier', 200);
    expect(result).toBe(longName);
  });

  it('should export correct length constants', () => {
    expect(MAX_IDENTIFIER_LENGTH_POSTGRES).toBe(63);
    expect(MAX_IDENTIFIER_LENGTH_MYSQL).toBe(64);
    expect(MAX_IDENTIFIER_LENGTH_SQLITE).toBe(256);
  });
});

describe('PostgreSQL Identifier Escaping', () => {
  it('should wrap in double quotes', () => {
    const result = escapePostgresIdentifier('users');
    expect(result).toBe('"users"');
  });

  it('should escape internal double quotes', () => {
    // Note: This should fail validation because double quotes are dangerous
    expect(() => escapePostgresIdentifier('use"rs')).toThrow('dangerous characters');
  });

  it('should handle underscores', () => {
    const result = escapePostgresIdentifier('user_name');
    expect(result).toBe('"user_name"');
  });
});

describe('MySQL Identifier Escaping', () => {
  it('should wrap in backticks', () => {
    const result = escapeMySQLIdentifier('users');
    expect(result).toBe('`users`');
  });

  it('should handle underscores', () => {
    const result = escapeMySQLIdentifier('user_name');
    expect(result).toBe('`user_name`');
  });
});

describe('SQL String Literal Escaping', () => {
  it('should wrap in single quotes', () => {
    const result = escapeSqlStringLiteral('hello');
    expect(result).toBe("'hello'");
  });

  it('should escape single quotes by doubling', () => {
    const result = escapeSqlStringLiteral("it's");
    expect(result).toBe("'it''s'");
  });

  it('should handle empty string', () => {
    const result = escapeSqlStringLiteral('');
    expect(result).toBe("''");
  });

  it('should handle multiple single quotes', () => {
    const result = escapeSqlStringLiteral("O'Brien's");
    expect(result).toBe("'O''Brien''s'");
  });

  it('should throw for non-string value', () => {
    expect(() => escapeSqlStringLiteral(123)).toThrow('must be a string');
  });
});

describe('formatDsl', () => {
  it('should format model with proper indentation', () => {
    const input = `model User {
id Serial @pk
name VarChar(100)
}`;
    const result = formatDsl(input);
    expect(result).toContain('  id Serial @pk');
    expect(result).toContain('  name VarChar(100)');
  });

  it('should handle empty lines', () => {
    const input = `model User {

id Serial @pk

}`;
    const result = formatDsl(input);
    expect(result.split('\n').filter(l => l === '')).toHaveLength(2);
  });

  it('should handle nested braces', () => {
    const input = `model User {
id Serial @pk
}
model Post {
id Serial @pk
}`;
    const result = formatDsl(input);
    expect(result).toContain('model User {');
    expect(result).toContain('model Post {');
  });
});

describe('generateMigrationFilename', () => {
  it('should generate timestamped filename', () => {
    const result = generateMigrationFilename('create_users');
    expect(result).toMatch(/^\d{14}_create_users\.sigl$/);
  });

  it('should lowercase the name', () => {
    const result = generateMigrationFilename('Create_Users');
    expect(result).toContain('create_users');
  });

  it('should replace special characters with underscores', () => {
    const result = generateMigrationFilename('add user-table');
    expect(result).toContain('add_user_table');
  });

  it('should end with .sact extension', () => {
    const result = generateMigrationFilename('test');
    expect(result.endsWith('.sigl')).toBeTrue();
  });
});

describe('createMigrationTemplate', () => {
  it('should create template with model name', () => {
    const result = createMigrationTemplate('create_users');
    expect(result).toContain('model CreateUsers');
  });

  it('should include id column', () => {
    const result = createMigrationTemplate('test');
    expect(result).toContain('id');
    expect(result).toContain('Serial');
    expect(result).toContain('@pk');
  });

  it('should include createdAt column', () => {
    const result = createMigrationTemplate('test');
    expect(result).toContain('createdAt');
    expect(result).toContain('Timestamp');
  });

  it('should include migration comment', () => {
    const result = createMigrationTemplate('my_migration');
    expect(result).toContain('# Migration: my_migration');
  });
});

describe('formatTable', () => {
  it('should format simple table', () => {
    const headers = ['Name', 'Age'];
    const rows = [['Alice', '30'], ['Bob', '25']];
    const result = formatTable(headers, rows);

    expect(result).toContain('Name');
    expect(result).toContain('Age');
    expect(result).toContain('Alice');
    expect(result).toContain('Bob');
  });

  it('should handle empty rows', () => {
    const headers = ['Name'];
    const rows = [];
    const result = formatTable(headers, rows);
    expect(result).toBe('');
  });

  it('should align columns', () => {
    const headers = ['Name', 'Age'];
    const rows = [['AliceSmith', '30']];
    const result = formatTable(headers, rows);
    const lines = result.split('\n');

    // Header and separator should be aligned
    expect(lines[0].length).toBe(lines[1].length);
  });
});

describe('truncate', () => {
  it('should not truncate short text', () => {
    const result = truncate('hello', 10);
    expect(result).toBe('hello');
  });

  it('should truncate long text with ellipsis', () => {
    const result = truncate('hello world', 8);
    expect(result).toBe('hello...');
    expect(result.length).toBe(8);
  });

  it('should handle exact length', () => {
    const result = truncate('hello', 5);
    expect(result).toBe('hello');
  });

  it('should handle very small maxLength', () => {
    const result = truncate('hello', 2);
    expect(result).toBe('he');
  });

  it('should handle maxLength of 3', () => {
    const result = truncate('hello', 3);
    expect(result).toBe('hel');
  });
});

describe('pluralize', () => {
  it('should not pluralize for count 1', () => {
    expect(pluralize('file', 1)).toBe('file');
  });

  it('should pluralize for count 0', () => {
    expect(pluralize('file', 0)).toBe('files');
  });

  it('should pluralize for count > 1', () => {
    expect(pluralize('file', 5)).toBe('files');
  });
});
