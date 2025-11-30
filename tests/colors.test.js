/**
 * Colors Tests
 */

import { describe, it, expect } from './test-runner.js';
import { c } from '../dist/utils/colors.js';

describe('Colors Utility', () => {
  it('should have reset function', () => {
    expect(typeof c.reset).toBe('function');
  });

  it('should have bold function', () => {
    expect(typeof c.bold).toBe('function');
  });

  it('should have dim function', () => {
    expect(typeof c.dim).toBe('function');
  });

  it('should have all foreground colors', () => {
    expect(typeof c.black).toBe('function');
    expect(typeof c.red).toBe('function');
    expect(typeof c.green).toBe('function');
    expect(typeof c.yellow).toBe('function');
    expect(typeof c.blue).toBe('function');
    expect(typeof c.magenta).toBe('function');
    expect(typeof c.cyan).toBe('function');
    expect(typeof c.white).toBe('function');
    expect(typeof c.gray).toBe('function');
  });

  it('should have status functions', () => {
    expect(typeof c.success).toBe('function');
    expect(typeof c.error).toBe('function');
    expect(typeof c.info).toBe('function');
    expect(typeof c.warning).toBe('function');
  });

  it('should wrap text with ANSI codes', () => {
    const result = c.red('test');
    expect(result).toContain('test');
    expect(result).toContain('\x1b[');
  });

  it('should include reset code at end', () => {
    const result = c.green('test');
    expect(result).toContain('\x1b[0m');
  });

  it('should format bold text', () => {
    const result = c.bold('test');
    expect(result).toContain('\x1b[1m');
    expect(result).toContain('test');
  });

  it('should format dim text', () => {
    const result = c.dim('test');
    expect(result).toContain('\x1b[2m');
    expect(result).toContain('test');
  });

  it('should format success message with checkmark', () => {
    const result = c.success('done');
    expect(result).toContain('✓');
    expect(result).toContain('done');
  });

  it('should format error message with X', () => {
    const result = c.error('failed');
    expect(result).toContain('✗');
    expect(result).toContain('failed');
  });

  it('should format info message with icon', () => {
    const result = c.info('message');
    expect(result).toContain('ℹ');
    expect(result).toContain('message');
  });

  it('should format warning message with icon', () => {
    const result = c.warning('caution');
    expect(result).toContain('⚠');
    expect(result).toContain('caution');
  });

  it('should handle empty strings', () => {
    const result = c.red('');
    expect(result).toContain('\x1b[');
  });

  it('should handle special characters', () => {
    const result = c.green('hello <world> & "test"');
    expect(result).toContain('hello <world> & "test"');
  });

  it('should handle unicode', () => {
    const result = c.blue('テスト 测试 🚀');
    expect(result).toContain('テスト 测试 🚀');
  });
});
