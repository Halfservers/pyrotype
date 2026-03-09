import { api } from '@/lib/http';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';

export interface EggPreview {
  egg: {
    id: number;
    name: string;
    description: string;
    startup: string;
  };
  variables: Array<{
    id: number;
    name: string;
    description: string;
    env_variable: string;
    default_value: string;
    user_viewable: boolean;
    user_editable: boolean;
    rules: string;
  }>;
  docker_images: Record<string, string>;
  default_docker_image: string | null;
  warnings?: Array<{
    type: string;
    message: string;
    severity: string;
  }>;
}

export interface ApplyEggChangeRequest {
  egg_id: number;
  nest_id: number;
  docker_image?: string;
  startup_command?: string;
  environment?: Record<string, string>;
  should_backup?: boolean;
  should_wipe?: boolean;
}

export interface ApplyEggChangeResponse {
  message: string;
  operation_id: string;
  status: string;
}

export const previewEggChange = async (
  uuid: string,
  eggId: number,
  nestId: number,
): Promise<EggPreview> => {
  const daemonType = getGlobalDaemonType();
  return api.post<EggPreview>(
    `/api/client/servers/${daemonType}/${uuid}/settings/egg/preview`,
    { egg_id: eggId, nest_id: nestId },
  );
};

export const applyEggChange = async (
  uuid: string,
  data: ApplyEggChangeRequest,
): Promise<ApplyEggChangeResponse> => {
  const daemonType = getGlobalDaemonType();
  return api.post<ApplyEggChangeResponse>(
    `/api/client/servers/${daemonType}/${uuid}/settings/egg/apply`,
    data,
  );
};

export const applyEggChangeSync = async (
  uuid: string,
  data: ApplyEggChangeRequest,
): Promise<void> => {
  const daemonType = getGlobalDaemonType();

  if (daemonType?.toLowerCase() === 'elytra') {
    await api.post(`/api/client/servers/${daemonType}/${uuid}/settings/egg/apply`, data);
    return;
  }

  if (daemonType?.toLowerCase() === 'wings') {
    const {
      egg_id,
      nest_id,
      docker_image,
      environment = {},
      should_backup = false,
      should_wipe = false,
    } = data;

    await api.put(`/api/client/servers/${daemonType}/${uuid}/settings/egg`, {
      egg_id,
      nest_id,
    });

    if (docker_image) {
      await api.put(`/api/client/servers/${daemonType}/${uuid}/settings/docker-image`, {
        docker_image,
      });
    }

    const envPromises = Object.entries(environment).map(([key, value]) =>
      api.put(`/api/client/servers/${daemonType}/${uuid}/startup/variable`, { key, value }),
    );
    await Promise.all(envPromises);

    if (should_backup) {
      await api.post(`/api/client/servers/${daemonType}/${uuid}/backups`, {
        name: `Software Change Backup - ${new Date().toISOString()}`,
        is_locked: false,
      });
    }

    if (should_wipe) {
      const filesResponse: any = await api.get(
        `/api/client/servers/${daemonType}/${uuid}/files/list`,
        { directory: '/' },
      );
      const files = filesResponse?.data || [];
      if (files.length > 0) {
        const fileNames = files.map((file: any) => file.name);
        await api.post(`/api/client/servers/${daemonType}/${uuid}/files/delete`, {
          root: '/',
          files: fileNames,
        });
      }
    }

    await api.post(`/api/client/servers/${daemonType}/${uuid}/settings/reinstall`);
  }
};
