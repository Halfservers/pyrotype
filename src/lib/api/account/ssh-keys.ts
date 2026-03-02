import http, { type FractalResponseList } from '@/lib/api/http';

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
  const { data } = await http.get('/api/client/account/ssh-keys');
  return (data as FractalResponseList).data.map((datum: any) => toSSHKey(datum.attributes));
};

export const createSSHKey = async (name: string, publicKey: string): Promise<SSHKey> => {
  const { data } = await http.post('/api/client/account/ssh-keys', {
    name,
    public_key: publicKey,
  });
  return toSSHKey(data.attributes);
};

export const deleteSSHKey = async (fingerprint: string): Promise<void> => {
  await http.post('/api/client/account/ssh-keys/remove', { fingerprint });
};
