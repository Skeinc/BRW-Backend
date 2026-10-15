import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const password: string | undefined = process.argv[2];

if (password === undefined || password.length === 0) {
  console.error('Usage: npm run admin:hash -- <password>');
  process.exit(1);
}

const hash: string = await bcrypt.hash(password, SALT_ROUNDS);
console.log(`ADMIN_PASSWORD_HASH='${hash}'`);
