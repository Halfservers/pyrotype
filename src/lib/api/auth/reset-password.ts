import { api } from '@/lib/http';

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

export const requestPasswordReset = async (email: string): Promise<void> => {
  await api.post('/api/auth/password', { email });
};

export const performPasswordReset = async (
  email: string,
  data: ResetPasswordData,
): Promise<PasswordResetResponse> => {
  const response = await api.post<{ redirect_to?: string | null; send_to_login?: boolean }>('/api/auth/password/reset', { email, ...data });
  return {
    redirectTo: response.redirect_to,
    sendToLogin: response.send_to_login ?? false,
  };
};
