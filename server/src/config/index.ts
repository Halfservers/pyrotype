import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default('file:./prisma/dev.db'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  SESSION_SECRET: z.string().default('pyrotype-dev-secret-change-me'),
  JWT_SECRET: z.string().default('pyrotype-jwt-secret-change-me'),
  APP_URL: z.string().default('http://localhost:3000'),
  APP_VERSION: z.string().default('1.0.0'),
  MAIL_HOST: z.string().default('localhost'),
  MAIL_PORT: z.coerce.number().default(587),
  MAIL_FROM: z.string().default('noreply@pyrotype.local'),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
