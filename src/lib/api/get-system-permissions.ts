import http from '@/lib/api/http';

export interface PanelPermissions {
  [key: string]: {
    description: string;
    keys: Record<string, string>;
  };
}

export default (): Promise<PanelPermissions> => {
  return new Promise((resolve, reject) => {
    http
      .get('/api/client/permissions')
      .then(({ data }) => resolve(data.attributes.permissions))
      .catch(reject);
  });
};
