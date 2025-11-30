/**
 * Validator Tests
 * Tests for path-validator.ts and file-validator.ts
 */

import { describe, it, expect } from './test-runner.js';
import {
  validateMigrationName,
  validateMigrationPath,
  validatePathWithinDirectory,
} from '../dist/utils/path-validator.js';
import {
  formatBytes,
  DEFAULT_MAX_MIGRATION_FILE_SIZE,
  DEFAULT_MAX_TOTAL_MIGRATIONS_SIZE,
} from '../dist/utils/file-validator.js';

describe('validateMigrationName', () => {
  it('should accept valid migration name', () => {
    const result = validateMigrationName('create_users_table');
    expect(result.sanitized).toBe('create_users_table');
    expect(result.safe).toBeTrue();
  });

  it('should accept alphanumeric names', () => {
    const result = validateMigrationName('migration001');
    expect(result.sanitized).toBe('migration001');
  });

  it('should accept names with hyphens', () => {
    const result = validateMigrationName('create-users-table');
    expect(result.sanitized).toBe('create-users-table');
  });

  it('should accept names starting with numbers', () => {
    const result = validateMigrationName('001_init');
    expect(result.sanitized).toBe('001_init');
  });

  it('should trim whitespace', () => {
    const result = validateMigrationName('  my_migration  ');
    expect(result.sanitized).toBe('my_migration');
  });

  it('should throw for empty string', () => {
    expect(() => validateMigrationName('')).toThrow('non-empty string');
  });

  it('should throw for null', () => {
    expect(() => validateMigrationName(null)).toThrow('non-empty string');
  });

  it('should throw for undefined', () => {
    expect(() => validateMigrationName(undefined)).toThrow('non-empty string');
  });

  it('should throw for path traversal with ../', () => {
    expect(() => validateMigrationName('../etc/passwd')).toThrow('Only alphanumeric');
  });

  it('should throw for path traversal with ..\\', () => {
    expect(() => validateMigrationName('..\\windows\\system32')).toThrow('Only alphanumeric');
  });

  it('should throw for special characters', () => {
    expect(() => validateMigrationName('my;migration')).toThrow('Only alphanumeric');
  });

  it('should throw for spaces in name', () => {
    expect(() => validateMigrationName('my migration')).toThrow('Only alphanumeric');
  });

  it('should throw for slashes', () => {
    expect(() => validateMigrationName('my/migration')).toThrow('Only alphanumeric');
  });

  it('should throw for backslashes', () => {
    expect(() => validateMigrationName('my\\migration')).toThrow('Only alphanumeric');
  });

  it('should throw for dots', () => {
    expect(() => validateMigrationName('my.migration')).toThrow('Only alphanumeric');
  });

  it('should throw for name starting with underscore', () => {
    expect(() => validateMigrationName('_private')).toThrow('must start with a letter or number');
  });

  it('should throw for name starting with hyphen', () => {
    expect(() => validateMigrationName('-invalid')).toThrow('must start with a letter or number');
  });

  it('should throw for too long name', () => {
    const longName = 'a'.repeat(101);
    expect(() => validateMigrationName(longName)).toThrow('too long');
  });

  it('should accept name at max length', () => {
    const maxName = 'a'.repeat(100);
    const result = validateMigrationName(maxName);
    expect(result.sanitized).toBe(maxName);
  });

  it('should decode URL-encoded path traversal', () => {
    // %2F is URL-encoded /
    expect(() => validateMigrationName('..%2F..%2Fetc')).toThrow('Only alphanumeric');
  });

  it('should decode double URL-encoded path traversal', () => {
    // %252F is double-encoded /
    expect(() => validateMigrationName('..%252F..%252Fetc')).toThrow('Only alphanumeric');
  });
});

describe('validateMigrationPath', () => {
  it('should return valid path for valid name', () => {
    const result = validateMigrationPath('create_users', './migrations');
    expect(result).toContain('create_users.sigl');
  });

  it('should throw for path traversal attempt', () => {
    expect(() => validateMigrationPath('../evil', './migrations')).toThrow('Only alphanumeric');
  });
});

describe('validatePathWithinDirectory', () => {
  it('should return true for valid path', () => {
    const result = validatePathWithinDirectory('./migrations/test.sigl', './migrations');
    expect(result).toBeTrue();
  });

  it('should throw for path outside directory', () => {
    expect(() => validatePathWithinDirectory('../outside.sigl', './migrations')).toThrow('outside allowed directory');
  });
});

describe('formatBytes', () => {
  it('should format 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('should format bytes', () => {
    expect(formatBytes(500)).toBe('500 Bytes');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
  });

  it('should format gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('should format with decimals', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });
});

describe('File Size Constants', () => {
  it('should have correct default max migration file size (5MB)', () => {
    expect(DEFAULT_MAX_MIGRATION_FILE_SIZE).toBe(5 * 1024 * 1024);
  });

  it('should have correct default max total migrations size (50MB)', () => {
    expect(DEFAULT_MAX_TOTAL_MIGRATIONS_SIZE).toBe(50 * 1024 * 1024);
  });
});
