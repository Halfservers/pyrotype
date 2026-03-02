import http from '@/lib/api/http';

export interface TwoFactorTokenData {
  image_url_data: string;
  secret: string;
}

export const getTwoFactorTokenData = (): Promise<TwoFactorTokenData> => {
  return new Promise((resolve, reject) => {
    http
      .get('/api/client/account/two-factor')
      .then(({ data }) => resolve(data.data))
      .catch(reject);
  });
};

export const enableTwoFactor = async (code: string, password: string): Promise<string[]> => {
  const { data } = await http.post('/api/client/account/two-factor', { code, password });
  return data.attributes.tokens;
};

export const disableTwoFactor = (password: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    http
      .post('/api/client/account/two-factor/disable', { password })
      .then(() => resolve())
      .catch(reject);
  });
};
