import type { LoginResponse } from '@/lib/api/auth/login';
import { api } from '@/lib/http';

export default async (token: string, code: string, recoveryToken?: string): Promise<LoginResponse> => {
  const data = await api.post<{ data: { complete: boolean; intended?: string } }>('/api/auth/login/checkpoint', {
    confirmation_token: token,
    authentication_code: code,
    recovery_token: recoveryToken && recoveryToken.length > 0 ? recoveryToken : undefined,
  });
  return {
    complete: data.data.complete,
    intended: data.data.intended || undefined,
  };
};
