import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

let _prisma: InstanceType<typeof PrismaClient> | null = null;

export function getPrisma(): InstanceType<typeof PrismaClient> {
  if (!_prisma) {
    const connectionString = `${process.env.DATABASE_URL}`;
    const adapter = new PrismaBetterSqlite3({ url: connectionString });
    _prisma = new PrismaClient({ adapter }) as InstanceType<typeof PrismaClient>;
  }
  return _prisma;
}

export const prisma = new Proxy({} as InstanceType<typeof PrismaClient>, {
  get(_target, prop) {
    return (getPrisma() as any)[prop];
  },
});
