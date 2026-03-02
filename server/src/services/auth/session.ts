import session from 'express-session';
import { config } from '../../config';

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

export const sessionMiddleware = session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'pyrotype_session',
  cookie: {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
});

export function destroySession(req: { session: session.Session & Partial<session.SessionData> }): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
