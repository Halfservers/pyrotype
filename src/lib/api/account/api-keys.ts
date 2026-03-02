import http from '@/lib/api/http';

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

export const getApiKeys = (): Promise<ApiKey[]> => {
  return new Promise((resolve, reject) => {
    http
      .get('/api/client/account/api-keys')
      .then(({ data }) => resolve((data.data || []).map((d: any) => rawDataToApiKey(d.attributes))))
      .catch(reject);
  });
};

export const createApiKey = (
  description: string,
  allowedIps: string,
): Promise<ApiKey & { secretToken: string }> => {
  return new Promise((resolve, reject) => {
    http
      .post('/api/client/account/api-keys', {
        description,
        allowed_ips: allowedIps.length > 0 ? allowedIps.split('\n') : [],
      })
      .then(({ data }) =>
        resolve({
          ...rawDataToApiKey(data.attributes),
          secretToken: data.meta?.secret_token ?? '',
        }),
      )
      .catch(reject);
  });
};

export const deleteApiKey = (identifier: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    http
      .delete(`/api/client/account/api-keys/${identifier}`)
      .then(() => resolve())
      .catch(reject);
  });
};
