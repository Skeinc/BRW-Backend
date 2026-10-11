#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';

const LINE = '─'.repeat(28);

/**
 * @param {string} label
 * @param {string} command
 * @param {string[]} args
 */
async function runStep(label, command, args) {
  console.log(`${CYAN}→${RESET} ${BOLD}${label}${RESET}`);
  const started = Date.now();
  const code = await spawnInherit(command, args);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (code === 0) {
    console.log(`${GREEN}✓${RESET} ${label} ${DIM}${seconds}s${RESET}\n`);
    return;
  }
  console.log(`${RED}✗${RESET} ${label} ${DIM}${seconds}s${RESET}\n`);
  throw new Error(label);
}

/**
 * @param {string} command
 * @param {string[]} args
 * @returns {Promise<number>}
 */
function spawnInherit(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    });
    child.on('error', () => resolve(1));
    child.on('close', (code) => resolve(code ?? 1));
  });
}

/**
 * @param {string} title
 * @param {string} color
 */
function banner(title, color) {
  console.log(`${color}${BOLD}── ${title} ${LINE.slice(Math.min(title.length + 3, LINE.length))}${RESET}`);
}

async function main() {
  console.log('');
  banner('pre-commit', CYAN);
  try {
    await runStep('Prettier (staged)', 'npx', ['lint-staged']);
    await runStep('Typecheck', 'npm', ['run', 'typecheck']);
    await runStep('Lint', 'npm', ['run', 'lint']);
    banner('passed', GREEN);
    console.log('');
  } catch {
    banner('failed', RED);
    console.log(`${YELLOW}Commit blocked.${RESET} Fix the step above and try again.\n`);
    process.exit(1);
  }
}

await main();
