import { api } from '@/lib/http';
import type { FractalResponseList } from '@/types/api';

export interface SSHKey {
  name: string;
  publicKey: string;
  fingerprint: string;
  createdAt: Date;
}

function toSSHKey(data: any): SSHKey {
  return {
    name: data.name,
    publicKey: data.public_key,
    fingerprint: data.fingerprint,
    createdAt: new Date(data.created_at),
  };
}

export const getSSHKeys = async (): Promise<SSHKey[]> => {
  const data = await api.get<FractalResponseList>('/api/client/account/ssh-keys');
  return data.data.map((datum: any) => toSSHKey(datum.attributes));
};

export const createSSHKey = async (name: string, publicKey: string): Promise<SSHKey> => {
  const data: any = await api.post('/api/client/account/ssh-keys', {
    name,
    public_key: publicKey,
  });
  return toSSHKey(data.attributes);
};

export const deleteSSHKey = async (fingerprint: string): Promise<void> => {
  await api.post('/api/client/account/ssh-keys/remove', { fingerprint });
};
