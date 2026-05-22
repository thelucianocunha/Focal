#!/usr/bin/env node
// Focal/tests/run_tests.js
// Convenience runner — executes all test files and prints a summary.
// Internally delegates to Node's built-in test runner (node:test, Node 18+).
// Zero npm dependencies.
//
// Usage (from the Tasks/ parent directory):
//   node Focal/tests/run_tests.js
//
// Or from inside Focal/:
//   node tests/run_tests.js
//
// To add a new test file: append its path to the testFiles array below,
// then update the expected count comment in CLAUDE.md § Unit Tests.
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');

const testsDir = __dirname;
const testFiles = [
  'test_dates.test.js',
  'test_aging.test.js',
  'test_filters.test.js',
  'test_i18n.test.js',
  'test_persistence.test.js',
  'test_tasks.test.js',
  'test_outcomes.test.js',
  'test_inbox.test.js',
].map(f => path.join(testsDir, f));

const result = spawnSync(
  process.execPath,
  ['--test', ...testFiles],
  { stdio: 'inherit' }
);

process.exit(result.status ?? 0);
