import { api } from '@/lib/http';
import type { FractalResponseList } from '@/types/api';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';
import { type ServerEggVariable, rawDataToServerEggVariable } from '@/lib/api/transformers';

export interface StartupData {
  invocation: string;
  variables: ServerEggVariable[];
  dockerImages: Record<string, string>;
  rawStartupCommand: string;
}

export const getServerStartup = async (uuid: string): Promise<StartupData> => {
  const data: any = await api.get(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/startup`,
  );

  const variables = ((data as FractalResponseList).data || []).map(rawDataToServerEggVariable);

  return {
    variables,
    invocation: data.meta.startup_command,
    dockerImages: data.meta.docker_images || {},
    rawStartupCommand: data.meta.raw_startup_command,
  };
};

export const updateStartupVariable = async (
  uuid: string,
  key: string,
  value: string,
): Promise<[ServerEggVariable, string]> => {
  const data: any = await api.put(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/startup/variable`,
    { key, value },
  );
  return [rawDataToServerEggVariable(data), data.meta.startup_command];
};

export const updateStartupCommand = async (uuid: string, startup: string): Promise<string> => {
  const data: any = await api.put(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/startup/command`,
    { startup },
  );
  return data.meta.startup_command;
};

export const processStartupCommand = async (uuid: string, command: string): Promise<string> => {
  const daemonType = getGlobalDaemonType();
  const data: any = await api.post(
    `/api/client/servers/${daemonType}/${uuid}/startup/command/process`,
    { command },
  );
  return data.processed_command;
};

export const resetStartupCommand = async (uuid: string): Promise<string> => {
  const data: any = await api.get(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/startup/command/default`,
  );
  return data.default_startup_command;
};
