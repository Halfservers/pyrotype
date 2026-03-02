import http, { type FractalResponseList } from '@/lib/api/http';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';
import { type ServerEggVariable, rawDataToServerEggVariable } from '@/lib/api/transformers';

export interface StartupData {
  invocation: string;
  variables: ServerEggVariable[];
  dockerImages: Record<string, string>;
  rawStartupCommand: string;
}

export const getServerStartup = async (uuid: string): Promise<StartupData> => {
  const { data } = await http.get(
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
  const { data } = await http.put(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/startup/variable`,
    { key, value },
  );
  return [rawDataToServerEggVariable(data), data.meta.startup_command];
};

export const updateStartupCommand = async (uuid: string, startup: string): Promise<string> => {
  const { data } = await http.put(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/startup/command`,
    { startup },
  );
  return data.meta.startup_command;
};

export const processStartupCommand = (uuid: string, command: string): Promise<string> => {
  const daemonType = getGlobalDaemonType();
  return new Promise((resolve, reject) => {
    http
      .post(`/api/client/servers/${daemonType}/${uuid}/startup/command/process`, { command })
      .then(({ data }) => resolve(data.processed_command))
      .catch(reject);
  });
};

export const resetStartupCommand = async (uuid: string): Promise<string> => {
  const { data } = await http.get(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/startup/command/default`,
  );
  return data.default_startup_command;
};
