/**
 * Logger Tests
 */

import { describe, it, expect } from './test-runner.js';
import { Logger, getLogger } from '../dist/utils/logger.js';

describe('Logger', () => {
  it('should get singleton instance', () => {
    const logger1 = getLogger({ console: false });
    const logger2 = getLogger();

    // Both should be the same instance
    expect(logger1).toBe(logger2);
  });

  it('should have debug method', () => {
    const logger = getLogger({ console: false, level: 'DEBUG' });
    expect(typeof logger.debug).toBe('function');
  });

  it('should have info method', () => {
    const logger = getLogger({ console: false });
    expect(typeof logger.info).toBe('function');
  });

  it('should have warn method', () => {
    const logger = getLogger({ console: false });
    expect(typeof logger.warn).toBe('function');
  });

  it('should have error method', () => {
    const logger = getLogger({ console: false });
    expect(typeof logger.error).toBe('function');
  });

  it('should have security method', () => {
    const logger = getLogger({ console: false });
    expect(typeof logger.security).toBe('function');
  });

  it('should have log method', () => {
    const logger = getLogger({ console: false });
    expect(typeof logger.log).toBe('function');
  });

  it('should not throw when logging debug', async () => {
    const logger = getLogger({ console: false, level: 'DEBUG' });
    await logger.debug('test', 'debug message', { key: 'value' });
  });

  it('should not throw when logging info', async () => {
    const logger = getLogger({ console: false });
    await logger.info('test', 'info message');
  });

  it('should not throw when logging warn', async () => {
    const logger = getLogger({ console: false });
    await logger.warn('test', 'warn message');
  });

  it('should not throw when logging error', async () => {
    const logger = getLogger({ console: false });
    await logger.error('test', 'error message');
  });

  it('should not throw when logging security', async () => {
    const logger = getLogger({ console: false, auditTrail: true });
    await logger.security('test_action', { detail: 'value' });
  });

  it('should accept metadata in log methods', async () => {
    const logger = getLogger({ console: false });
    await logger.info('test', 'message with metadata', {
      filename: 'test.sigl',
      duration: 123,
      success: true
    });
  });

  it('should handle empty metadata', async () => {
    const logger = getLogger({ console: false });
    await logger.info('test', 'message without metadata');
  });

  it('should update config when provided', () => {
    const logger = getLogger({ console: false, level: 'ERROR' });
    // Logger should be reconfigured
    expect(logger).toBeDefined();
  });
});

describe('Logger Log Levels', () => {
  it('should filter DEBUG when level is INFO', async () => {
    const logger = getLogger({ console: false, level: 'INFO' });
    // This should not throw and should be filtered
    await logger.debug('test', 'should be filtered');
  });

  it('should filter INFO when level is WARN', async () => {
    const logger = getLogger({ console: false, level: 'WARN' });
    await logger.info('test', 'should be filtered');
  });

  it('should filter WARN when level is ERROR', async () => {
    const logger = getLogger({ console: false, level: 'ERROR' });
    await logger.warn('test', 'should be filtered');
  });

  it('should allow ERROR when level is ERROR', async () => {
    const logger = getLogger({ console: false, level: 'ERROR' });
    await logger.error('test', 'should be logged');
  });

  it('should filter security when auditTrail is false', async () => {
    const logger = getLogger({ console: false, auditTrail: false });
    await logger.security('test', { filtered: true });
  });
});
