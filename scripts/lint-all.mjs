import { spawnSync } from 'node:child_process';

const checks = [
  { label: 'ESLint', command: 'eslint', args: ['.'] },
  { label: 'UI copy', command: 'node', args: ['scripts/check-ui-copy.mjs'] },
];

let hasFailure = false;
const failures = [];

for (const check of checks) {
  console.error(`\n> ${check.label}`);
  const result = spawnSync(check.command, check.args, { stdio: 'inherit', shell: process.platform === 'win32' });

  if (result.error) {
    hasFailure = true;
    failures.push(check.label);
    console.error(`\n${check.label} could not start: ${result.error.message}`);
    continue;
  }

  if (result.status !== 0) {
    hasFailure = true;
    failures.push(check.label);
    console.error(`\n${check.label} failed with exit code ${result.status ?? 1}.`);
  }
}

if (hasFailure) {
  console.error(`\nLint completed. Failed checks: ${failures.join(', ')}.`);
  process.exit(1);
}

console.error('\nLint completed. All checks passed.');
