import { api } from '@/lib/http';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';

export const renameServer = async (
  uuid: string,
  name: string,
  description?: string,
): Promise<void> => {
  await api.post(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/settings/rename`, {
    name,
    description,
  });
};

export const reinstallServer = async (uuid: string): Promise<void> => {
  await api.post(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/settings/reinstall`);
};

export const revertDockerImage = async (uuid: string): Promise<void> => {
  await api.post(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/settings/docker-image/revert`,
    { confirm: true },
  );
};

export const setSelectedDockerImage = async (
  uuid: string,
  image: string,
): Promise<void> => {
  await api.put(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/settings/docker-image`,
    { docker_image: image },
  );
};
