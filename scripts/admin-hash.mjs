#!/usr/bin/env node
import process from 'node:process';
import readline from 'node:readline/promises';
import bcrypt from 'bcryptjs';

const BCRYPT_COST = 10;

/**
 * @returns {Promise<string>}
 */
async function readPassword() {
  const fromArgument = process.argv[2];
  if (fromArgument) {
    return fromArgument;
  }
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  const password = await terminal.question('Admin password: ');
  terminal.close();
  return password;
}

async function main() {
  const password = await readPassword();
  if (password.length === 0) {
    console.error('Password must not be empty.');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, BCRYPT_COST);
  console.log('\nPut this line into .env (keep the single quotes, the hash contains `$`):\n');
  console.log(`ADMIN_PASSWORD_HASH='${hash}'`);
  console.log('\nIn docker-compose.yml or a shell variable double every `$` as `$$`.');
}

await main();
