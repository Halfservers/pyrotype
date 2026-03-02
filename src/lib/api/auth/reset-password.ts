import http from '@/lib/api/http';

interface ResetPasswordData {
  token: string;
  password: string;
  passwordConfirmation: string;
  [key: string]: string;
}

interface PasswordResetResponse {
  redirectTo?: string | null;
  sendToLogin: boolean;
}

export const requestPasswordReset = (email: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    http
      .post('/api/auth/password', { email })
      .then(() => resolve())
      .catch(reject);
  });
};

export const performPasswordReset = (
  email: string,
  data: ResetPasswordData,
): Promise<PasswordResetResponse> => {
  return new Promise((resolve, reject) => {
    http
      .post('/api/auth/password/reset', { email, ...data })
      .then((response) =>
        resolve({
          redirectTo: response.data.redirect_to,
          sendToLogin: response.data.send_to_login,
        }),
      )
      .catch(reject);
  });
};
