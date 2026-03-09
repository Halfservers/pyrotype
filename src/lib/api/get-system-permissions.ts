import { api } from '@/lib/http';

export interface PanelPermissions {
  [key: string]: {
    description: string;
    keys: Record<string, string>;
  };
}

export default async (): Promise<PanelPermissions> => {
  const data: any = await api.get('/api/client/permissions');
  return data.attributes.permissions;
};
