import { api } from '@/lib/http';

export interface TwoFactorTokenData {
  image_url_data: string;
  secret: string;
}

export const getTwoFactorTokenData = async (): Promise<TwoFactorTokenData> => {
  const data: any = await api.get('/api/client/account/two-factor');
  return data.data;
};

export const enableTwoFactor = async (code: string, password: string): Promise<string[]> => {
  const data: any = await api.post('/api/client/account/two-factor', { code, password });
  return data.attributes.tokens;
};

export const disableTwoFactor = async (password: string): Promise<void> => {
  await api.post('/api/client/account/two-factor/disable', { password });
};
