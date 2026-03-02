declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: 'development' | 'production' | 'test';
      PORT?: string;
      DATABASE_URL?: string;
      REDIS_URL?: string;
      SESSION_SECRET?: string;
      JWT_SECRET?: string;
      APP_URL?: string;
      APP_VERSION?: string;
      MAIL_HOST?: string;
      MAIL_PORT?: string;
      MAIL_FROM?: string;
    }
  }
}

export {};
