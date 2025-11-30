/**
 * Ledger Manager Tests
 */

import { describe, it, expect } from './test-runner.js';
import { LedgerManager } from '../dist/engine/ledger.js';
import { writeFile, unlink, mkdir, rm } from 'fs/promises';
import { join } from 'path';

// Test directory for ledger files
const TEST_DIR = './tests/temp';
const TEST_LEDGER = join(TEST_DIR, 'test_ledger.json');

// Helper to clean up test files
async function cleanup() {
  try {
    await rm(TEST_DIR, { recursive: true, force: true });
  } catch (e) {
    // Ignore errors
  }
}

// Helper to setup test directory
async function setup() {
  await cleanup();
  await mkdir(TEST_DIR, { recursive: true });
}

describe('LedgerManager', () => {
  it('should compute SHA-256 hash', () => {
    const hash1 = LedgerManager.computeHash('hello world');
    const hash2 = LedgerManager.computeHash('hello world');
    const hash3 = LedgerManager.computeHash('different content');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.length).toBe(64); // SHA-256 hex length
  });

  it('should start with empty ledger', async () => {
    await setup();
    const ledger = new LedgerManager(TEST_LEDGER);
    await ledger.load();

    expect(ledger.getCurrentBatch()).toBe(0);
    expect(ledger.getAppliedMigrations()).toHaveLength(0);

    await cleanup();
  });

  it('should record migration', async () => {
    await setup();
    const ledger = new LedgerManager(TEST_LEDGER);
    await ledger.load();

    await ledger.recordMigration('001_test.sigl', 'model Test { id Serial @pk }');

    expect(ledger.getCurrentBatch()).toBe(1);
    expect(ledger.getAppliedMigrations()).toHaveLength(1);
    expect(ledger.isApplied('001_test.sigl')).toBeTrue();

    await cleanup();
  });

  it('should record batch of migrations', async () => {
    await setup();
    const ledger = new LedgerManager(TEST_LEDGER);
    await ledger.load();

    await ledger.recordBatch([
      { filename: '001_users.sigl', content: 'model User { id Serial @pk }' },
      { filename: '002_posts.sigl', content: 'model Post { id Serial @pk }' },
    ]);

    expect(ledger.getCurrentBatch()).toBe(1);
    expect(ledger.getAppliedMigrations()).toHaveLength(2);

    // Both should be in the same batch
    const migrations = ledger.getAppliedMigrations();
    expect(migrations[0].batch).toBe(1);
    expect(migrations[1].batch).toBe(1);

    await cleanup();
  });

  it('should get pending migrations', async () => {
    await setup();
    const ledger = new LedgerManager(TEST_LEDGER);
    await ledger.load();

    await ledger.recordMigration('001_applied.sigl', 'content');

    const pending = ledger.getPendingMigrations([
      '001_applied.sigl',
      '002_pending.sigl',
      '003_pending.sigl',
    ]);

    expect(pending).toHaveLength(2);
    expect(pending).toContain('002_pending.sigl');
    expect(pending).toContain('003_pending.sigl');
    expect(pending).not.toContain('001_applied.sigl');

    await cleanup();
  });

  it('should get last batch migrations', async () => {
    await setup();
    const ledger = new LedgerManager(TEST_LEDGER);
    await ledger.load();

    // First batch
    await ledger.recordBatch([
      { filename: '001_first.sigl', content: 'content1' },
    ]);

    // Second batch
    await ledger.recordBatch([
      { filename: '002_second.sigl', content: 'content2' },
      { filename: '003_second.sigl', content: 'content3' },
    ]);

    const lastBatch = ledger.getLastBatchMigrations();
    expect(lastBatch).toHaveLength(2);
    expect(lastBatch[0].filename).toBe('003_second.sigl'); // Reversed order
    expect(lastBatch[1].filename).toBe('002_second.sigl');

    await cleanup();
  });

  it('should rollback last batch', async () => {
    await setup();
    const ledger = new LedgerManager(TEST_LEDGER);
    await ledger.load();

    await ledger.recordBatch([
      { filename: '001_first.sigl', content: 'content1' },
    ]);

    await ledger.recordBatch([
      { filename: '002_second.sigl', content: 'content2' },
    ]);

    expect(ledger.getCurrentBatch()).toBe(2);
    expect(ledger.getAppliedMigrations()).toHaveLength(2);

    await ledger.rollbackLastBatch();

    expect(ledger.getCurrentBatch()).toBe(1);
    expect(ledger.getAppliedMigrations()).toHaveLength(1);
    expect(ledger.isApplied('001_first.sigl')).toBeTrue();
    expect(ledger.isApplied('002_second.sigl')).toBeFalse();

    await cleanup();
  });

  it('should rollback to zero batch', async () => {
    await setup();
    const ledger = new LedgerManager(TEST_LEDGER);
    await ledger.load();

    await ledger.recordMigration('001_test.sigl', 'content');
    await ledger.rollbackLastBatch();

    expect(ledger.getCurrentBatch()).toBe(0);
    expect(ledger.getAppliedMigrations()).toHaveLength(0);

    await cleanup();
  });

  it('should persist and reload', async () => {
    await setup();

    // Create and save
    const ledger1 = new LedgerManager(TEST_LEDGER);
    await ledger1.load();
    await ledger1.recordMigration('001_test.sigl', 'content');

    // Release lock by loading a new ledger
    const ledger2 = new LedgerManager(TEST_LEDGER);
    await ledger2.load();

    expect(ledger2.getCurrentBatch()).toBe(1);
    expect(ledger2.isApplied('001_test.sigl')).toBeTrue();

    await cleanup();
  });

  it('should validate integrity with matching hash', async () => {
    await setup();
    const ledger = new LedgerManager(TEST_LEDGER);
    await ledger.load();

    const content = 'model Test { id Serial @pk }';
    await ledger.recordMigration('001_test.sigl', content);

    const migrations = new Map([['001_test.sigl', content]]);

    // Should not throw
    await ledger.validateIntegrity(migrations);

    await cleanup();
  });

  it('should detect integrity violation - modified file', async () => {
    await setup();
    const ledger = new LedgerManager(TEST_LEDGER);
    await ledger.load();

    await ledger.recordMigration('001_test.sigl', 'original content');

    const migrations = new Map([['001_test.sigl', 'modified content']]);

    await expect(async () => {
      await ledger.validateIntegrity(migrations);
    }).toThrowAsync('has been modified');

    await cleanup();
  });

  it('should detect integrity violation - missing file', async () => {
    await setup();
    const ledger = new LedgerManager(TEST_LEDGER);
    await ledger.load();

    await ledger.recordMigration('001_test.sigl', 'content');

    const migrations = new Map(); // Empty map - file missing

    await expect(async () => {
      await ledger.validateIntegrity(migrations);
    }).toThrowAsync('is missing');

    await cleanup();
  });

  it('should handle corrupted ledger file', async () => {
    await setup();

    // Write corrupted JSON
    await writeFile(TEST_LEDGER, 'not valid json');

    const ledger = new LedgerManager(TEST_LEDGER);

    await expect(async () => {
      await ledger.load();
    }).toThrowAsync('corrupted');

    await cleanup();
  });

  it('should handle empty batch recording', async () => {
    await setup();
    const ledger = new LedgerManager(TEST_LEDGER);
    await ledger.load();

    await ledger.recordBatch([]);

    expect(ledger.getCurrentBatch()).toBe(0);
    expect(ledger.getAppliedMigrations()).toHaveLength(0);

    await cleanup();
  });

  it('should force unlock', async () => {
    await setup();
    const ledger = new LedgerManager(TEST_LEDGER);

    // Create a lock file manually
    await writeFile(`${TEST_LEDGER}.lock`, JSON.stringify({
      pid: 99999,
      hostname: 'test',
      lockId: 'test-lock',
      acquiredAt: new Date().toISOString()
    }));

    // Force unlock should remove it
    await ledger.forceUnlock();

    // Now should be able to load normally
    await ledger.load();
    expect(ledger.getCurrentBatch()).toBe(0);

    await cleanup();
  });

  it('should validate write capability', async () => {
    await setup();
    const ledger = new LedgerManager(TEST_LEDGER);
    await ledger.load();

    // Should not throw
    await ledger.validateWriteCapability();

    await cleanup();
  });

  it('should return empty array for last batch when no migrations', async () => {
    await setup();
    const ledger = new LedgerManager(TEST_LEDGER);
    await ledger.load();

    const lastBatch = ledger.getLastBatchMigrations();
    expect(lastBatch).toHaveLength(0);

    await cleanup();
  });
});
