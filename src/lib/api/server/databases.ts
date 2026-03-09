import { api } from '@/lib/http';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';

export interface ServerDatabase {
  id: string;
  name: string;
  username: string;
  connectionString: string;
  allowConnectionsFrom: string;
  password?: string;
  maxConnections: number;
}

const rawDataToServerDatabase = (data: any): ServerDatabase => ({
  id: data.id,
  name: data.name,
  username: data.username,
  connectionString: `${data.host.address}:${data.host.port}`,
  allowConnectionsFrom: data.connections_from,
  password: data.relationships.password?.attributes?.password,
  maxConnections: data.max_connections ?? 0,
});

export const getServerDatabases = async (
  uuid: string,
  includePassword = true,
): Promise<ServerDatabase[]> => {
  const daemonType = getGlobalDaemonType();
  const data: any = await api.get(
    `/api/client/servers/${daemonType}/${uuid}/databases`,
    includePassword ? { include: 'password' } : undefined,
  );
  return (data.data || []).map((item: any) => rawDataToServerDatabase(item.attributes));
};

export const createServerDatabase = async (
  uuid: string,
  data: { connectionsFrom: string; databaseName: string },
): Promise<ServerDatabase> => {
  const response: any = await api.post(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/databases`,
    { database: data.databaseName, remote: data.connectionsFrom },
    { params: { include: 'password' } },
  );
  return rawDataToServerDatabase(response.attributes);
};

export const deleteServerDatabase = async (uuid: string, database: string): Promise<void> => {
  await api.delete(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/databases/${database}`);
};

export const rotateDatabasePassword = async (
  uuid: string,
  database: string,
): Promise<ServerDatabase> => {
  const daemonType = getGlobalDaemonType();
  const data: any = await api.post(
    `/api/client/${daemonType}/servers/${uuid}/databases/${database}/rotate-password`,
  );
  return rawDataToServerDatabase(data.attributes);
};
