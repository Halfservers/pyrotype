import type { User as PrismaUser, Server as PrismaServer, Node as PrismaNode } from '../generated/prisma/client';
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    twoFactorVerified?: boolean;
    pendingUserId?: number;
    authConfirmationToken?: {
      userId: number;
      tokenValue: string;
      expiresAt: number;
    };
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: PrismaUser & { rootAdmin: boolean };
      server?: PrismaServer;
      serverPermissions?: string[];
      node?: PrismaNode;
    }
  }
}

export {};
