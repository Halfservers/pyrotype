import http from '@/lib/api/http';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';

export const renameServer = (
  uuid: string,
  name: string,
  description?: string,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    http
      .post(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/settings/rename`, {
        name,
        description,
      })
      .then(() => resolve())
      .catch(reject);
  });
};

export const reinstallServer = (uuid: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    http
      .post(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/settings/reinstall`)
      .then(() => resolve())
      .catch(reject);
  });
};

export const revertDockerImage = async (uuid: string): Promise<void> => {
  await http.post(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/settings/docker-image/revert`,
    { confirm: true },
  );
};

export const setSelectedDockerImage = async (
  uuid: string,
  image: string,
): Promise<void> => {
  await http.put(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/settings/docker-image`,
    { docker_image: image },
  );
};
