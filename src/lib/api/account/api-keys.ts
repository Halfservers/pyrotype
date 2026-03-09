import { api } from '@/lib/http';

export interface ApiKey {
  identifier: string;
  description: string;
  allowedIps: string[];
  createdAt: Date | null;
  lastUsedAt: Date | null;
}

export const rawDataToApiKey = (data: any): ApiKey => ({
  identifier: data.identifier,
  description: data.description,
  allowedIps: data.allowed_ips,
  createdAt: data.created_at ? new Date(data.created_at) : null,
  lastUsedAt: data.last_used_at ? new Date(data.last_used_at) : null,
});

export const getApiKeys = async (): Promise<ApiKey[]> => {
  const data: any = await api.get('/api/client/account/api-keys');
  return (data.data || []).map((d: any) => rawDataToApiKey(d.attributes));
};

export const createApiKey = async (
  description: string,
  allowedIps: string,
): Promise<ApiKey & { secretToken: string }> => {
  const data: any = await api.post('/api/client/account/api-keys', {
    description,
    allowed_ips: allowedIps.length > 0 ? allowedIps.split('\n') : [],
  });
  return {
    ...rawDataToApiKey(data.attributes),
    secretToken: data.meta?.secret_token ?? '',
  };
};

export const deleteApiKey = async (identifier: string): Promise<void> => {
  await api.delete(`/api/client/account/api-keys/${identifier}`);
};
