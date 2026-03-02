import http, { type FractalResponseData } from '@/lib/api/http';
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

export const getServerSubusers = (uuid: string): Promise<Subuser[]> => {
  return new Promise((resolve, reject) => {
    http
      .get(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/users`)
      .then(({ data }) => resolve((data.data || []).map(rawDataToServerSubuser)))
      .catch(reject);
  });
};

export const createOrUpdateSubuser = (
  uuid: string,
  params: { email: string; permissions: string[] },
  subuser?: Subuser,
): Promise<Subuser> => {
  return new Promise((resolve, reject) => {
    http
      .post(
        `/api/client/servers/${getGlobalDaemonType()}/${uuid}/users${subuser ? `/${subuser.uuid}` : ''}`,
        { ...params },
      )
      .then((data) => resolve(rawDataToServerSubuser(data.data)))
      .catch(reject);
  });
};

export const deleteSubuser = (uuid: string, userId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    http
      .delete(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/users/${userId}`)
      .then(() => resolve())
      .catch(reject);
  });
};
