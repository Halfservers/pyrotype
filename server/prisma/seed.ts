import path from 'path';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const dbPath = path.resolve(__dirname, 'dev.db');
const db = new Database(dbPath);

async function main() {
  const password = await bcrypt.hash('password', 10);
  const uuid = crypto.randomUUID();
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@pyrotype.local');
  if (existing) {
    console.log('Dev user already exists, skipping seed.');
    return;
  }

  db.prepare(`
    INSERT INTO users (uuid, username, email, name_first, name_last, password, language, root_admin, use_totp, gravatar, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uuid, 'admin', 'admin@pyrotype.local', 'Admin', 'User', password, 'en', 1, 0, 0, now, now);

  console.log('Seeded dev user: admin@pyrotype.local (password: "password")');
}

main()
  .then(() => db.close())
  .catch((e) => {
    console.error(e);
    db.close();
    process.exit(1);
  });
