import { api } from '@/lib/http';

export default async (email: string, password: string): Promise<void> => {
  await api.put('/api/client/account/email', { email, password });
};
