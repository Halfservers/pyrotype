import { api } from '@/lib/http';
import type { FractalResponseData } from '@/types/api';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';

export interface Subuser {
  uuid: string;
  username: string;
  email: string;
  image: string;
  twoFactorEnabled: boolean;
  createdAt: Date;
  permissions: string[];
  can: (permission: string) => boolean;
}

const rawDataToServerSubuser = (data: FractalResponseData): Subuser => ({
  uuid: data.attributes.uuid,
  username: data.attributes.username,
  email: data.attributes.email,
  image: data.attributes.image,
  twoFactorEnabled: data.attributes['2fa_enabled'],
  createdAt: new Date(data.attributes.created_at),
  permissions: data.attributes.permissions || [],
  can: (permission) => (data.attributes.permissions || []).indexOf(permission) >= 0,
});

export const getServerSubusers = async (uuid: string): Promise<Subuser[]> => {
  const data: any = await api.get(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/users`,
  );
  return (data.data || []).map(rawDataToServerSubuser);
};

export const createOrUpdateSubuser = async (
  uuid: string,
  params: { email: string; permissions: string[] },
  subuser?: Subuser,
): Promise<Subuser> => {
  const data: any = await api.post(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/users${subuser ? `/${subuser.uuid}` : ''}`,
    { ...params },
  );
  return rawDataToServerSubuser(data);
};

export const deleteSubuser = async (uuid: string, userId: string): Promise<void> => {
  await api.delete(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/users/${userId}`);
};
