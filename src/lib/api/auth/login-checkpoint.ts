import type { LoginResponse } from '@/lib/api/auth/login';
import http from '@/lib/api/http';

export default (token: string, code: string, recoveryToken?: string): Promise<LoginResponse> => {
  return new Promise((resolve, reject) => {
    http
      .post('/api/auth/login/checkpoint', {
        confirmation_token: token,
        authentication_code: code,
        recovery_token: recoveryToken && recoveryToken.length > 0 ? recoveryToken : undefined,
      })
      .then((response) =>
        resolve({
          complete: response.data.data.complete,
          intended: response.data.data.intended || undefined,
        }),
      )
      .catch(reject);
  });
};
