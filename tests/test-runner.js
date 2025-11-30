/**
 * Simple Test Runner for Schemact
 * Runs all test suites and reports results
 */

import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

// Test registry
const tests = {
  passed: 0,
  failed: 0,
  skipped: 0,
  failures: [],
  suites: [],
};

// Current suite context
let currentSuite = null;

/**
 * Define a test suite
 */
export function describe(name, fn) {
  const suite = {
    name,
    tests: [],
    passed: 0,
    failed: 0,
  };
  tests.suites.push(suite);
  currentSuite = suite;

  try {
    fn();
  } catch (error) {
    console.error(`${colors.red}Suite "${name}" setup failed:${colors.reset}`, error);
  }

  currentSuite = null;
}

/**
 * Define a test case
 */
export function it(name, fn) {
  const test = { name, fn, suite: currentSuite?.name || 'Default' };
  if (currentSuite) {
    currentSuite.tests.push(test);
  }
}

/**
 * Skip a test
 */
it.skip = function(name, fn) {
  tests.skipped++;
};

/**
 * Assertion helpers
 */
export const expect = (actual) => ({
  toBe(expected) {
    if (actual !== expected) {
      throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  },
  toEqual(expected) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
      throw new Error(`Expected ${expectedStr}, got ${actualStr}`);
    }
  },
  toBeTrue() {
    if (actual !== true) {
      throw new Error(`Expected true, got ${JSON.stringify(actual)}`);
    }
  },
  toBeFalse() {
    if (actual !== false) {
      throw new Error(`Expected false, got ${JSON.stringify(actual)}`);
    }
  },
  toBeNull() {
    if (actual !== null) {
      throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
    }
  },
  toBeUndefined() {
    if (actual !== undefined) {
      throw new Error(`Expected undefined, got ${JSON.stringify(actual)}`);
    }
  },
  toBeDefined() {
    if (actual === undefined) {
      throw new Error(`Expected value to be defined, got undefined`);
    }
  },
  toBeInstanceOf(constructor) {
    if (!(actual instanceof constructor)) {
      throw new Error(`Expected instance of ${constructor.name}, got ${actual?.constructor?.name || typeof actual}`);
    }
  },
  toContain(expected) {
    if (typeof actual === 'string') {
      if (!actual.includes(expected)) {
        throw new Error(`Expected "${actual.substring(0, 100)}..." to contain "${expected}"`);
      }
    } else if (Array.isArray(actual)) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
      }
    } else {
      throw new Error(`toContain only works with strings and arrays`);
    }
  },
  toHaveLength(expected) {
    if (actual?.length !== expected) {
      throw new Error(`Expected length ${expected}, got ${actual?.length}`);
    }
  },
  toThrow(expectedMessage) {
    if (typeof actual !== 'function') {
      throw new Error(`Expected a function, got ${typeof actual}`);
    }
    let threw = false;
    let error = null;
    try {
      actual();
    } catch (e) {
      threw = true;
      error = e;
    }
    if (!threw) {
      throw new Error(`Expected function to throw, but it didn't`);
    }
    if (expectedMessage && !error.message.includes(expectedMessage)) {
      throw new Error(`Expected error message to contain "${expectedMessage}", got "${error.message}"`);
    }
  },
  toThrowAsync: async function(expectedMessage) {
    if (typeof actual !== 'function') {
      throw new Error(`Expected a function, got ${typeof actual}`);
    }
    let threw = false;
    let error = null;
    try {
      await actual();
    } catch (e) {
      threw = true;
      error = e;
    }
    if (!threw) {
      throw new Error(`Expected function to throw, but it didn't`);
    }
    if (expectedMessage && !error.message.includes(expectedMessage)) {
      throw new Error(`Expected error message to contain "${expectedMessage}", got "${error.message}"`);
    }
  },
  toMatch(pattern) {
    if (typeof actual !== 'string') {
      throw new Error(`Expected string, got ${typeof actual}`);
    }
    if (!pattern.test(actual)) {
      throw new Error(`Expected "${actual}" to match ${pattern}`);
    }
  },
  toBeGreaterThan(expected) {
    if (actual <= expected) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`);
    }
  },
  toBeLessThan(expected) {
    if (actual >= expected) {
      throw new Error(`Expected ${actual} to be less than ${expected}`);
    }
  },
  toBeGreaterThanOrEqual(expected) {
    if (actual < expected) {
      throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
    }
  },
  not: {
    toBe(expected) {
      if (actual === expected) {
        throw new Error(`Expected value to not be ${JSON.stringify(expected)}`);
      }
    },
    toContain(expected) {
      if (typeof actual === 'string' && actual.includes(expected)) {
        throw new Error(`Expected "${actual.substring(0, 100)}..." to not contain "${expected}"`);
      }
      if (Array.isArray(actual) && actual.includes(expected)) {
        throw new Error(`Expected array to not contain ${JSON.stringify(expected)}`);
      }
    },
    toThrow() {
      if (typeof actual !== 'function') {
        throw new Error(`Expected a function, got ${typeof actual}`);
      }
      try {
        actual();
      } catch (e) {
        throw new Error(`Expected function not to throw, but it threw: ${e.message}`);
      }
    },
  },
});

/**
 * Run all registered tests
 */
async function runTests() {
  console.log(`\n${colors.bold}${colors.cyan}Running Schemact Test Suite${colors.reset}\n`);
  console.log('='.repeat(60) + '\n');

  for (const suite of tests.suites) {
    console.log(`${colors.bold}${suite.name}${colors.reset}`);

    for (const test of suite.tests) {
      try {
        const result = test.fn();
        if (result instanceof Promise) {
          await result;
        }
        tests.passed++;
        suite.passed++;
        console.log(`  ${colors.green}✓${colors.reset} ${test.name}`);
      } catch (error) {
        tests.failed++;
        suite.failed++;
        tests.failures.push({
          suite: suite.name,
          test: test.name,
          error: error.message,
          stack: error.stack,
        });
        console.log(`  ${colors.red}✗${colors.reset} ${test.name}`);
        console.log(`    ${colors.dim}${error.message}${colors.reset}`);
      }
    }
    console.log();
  }

  // Print summary
  console.log('='.repeat(60));
  console.log(`\n${colors.bold}Test Summary${colors.reset}\n`);

  const total = tests.passed + tests.failed + tests.skipped;
  console.log(`  Total:   ${total}`);
  console.log(`  ${colors.green}Passed:  ${tests.passed}${colors.reset}`);

  if (tests.failed > 0) {
    console.log(`  ${colors.red}Failed:  ${tests.failed}${colors.reset}`);
  }

  if (tests.skipped > 0) {
    console.log(`  ${colors.yellow}Skipped: ${tests.skipped}${colors.reset}`);
  }

  const successRate = total > 0 ? ((tests.passed / total) * 100).toFixed(1) : 0;
  console.log(`\n  ${colors.bold}Success Rate: ${successRate}%${colors.reset}`);

  if (tests.failures.length > 0) {
    console.log(`\n${colors.bold}${colors.red}Failed Tests:${colors.reset}\n`);
    for (const failure of tests.failures) {
      console.log(`  ${colors.red}${failure.suite} > ${failure.test}${colors.reset}`);
      console.log(`    ${colors.dim}${failure.error}${colors.reset}\n`);
    }
  }

  console.log();

  // Exit with error code if tests failed
  if (tests.failed > 0) {
    process.exit(1);
  }
}

/**
 * Load and run all test files
 */
async function main() {
  const testFiles = await readdir(__dirname);
  const testModules = testFiles
    .filter(f => f.endsWith('.test.js'))
    .sort();

  console.log(`${colors.dim}Loading ${testModules.length} test files...${colors.reset}`);

  for (const file of testModules) {
    try {
      // Use pathToFileURL for proper Windows support
      const filePath = join(__dirname, file);
      const fileUrl = pathToFileURL(filePath).href;
      await import(fileUrl);
    } catch (error) {
      console.error(`${colors.red}Failed to load ${file}:${colors.reset}`, error);
    }
  }

  await runTests();
}

main().catch(console.error);
