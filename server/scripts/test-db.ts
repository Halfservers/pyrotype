import 'dotenv/config';
import path from 'path';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
let libsqlUrl = dbUrl;
if (dbUrl.startsWith('file:')) {
  libsqlUrl = 'file:' + path.resolve(dbUrl.slice(5));
}
console.log('Resolved URL:', libsqlUrl);

const libsql = createClient({ url: libsqlUrl });
const adapter = new PrismaLibSql(libsql);
const prisma = new (PrismaClient as any)({ adapter }) as InstanceType<typeof PrismaClient>;

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'admin@pyrotype.local' } });
  console.log('User found:', user ? user.username : 'NOT FOUND');
  process.exit(0);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
