import http from '@/lib/api/http';
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

export const getServerDatabases = (
  uuid: string,
  includePassword = true,
): Promise<ServerDatabase[]> => {
  const daemonType = getGlobalDaemonType();
  return new Promise((resolve, reject) => {
    http
      .get(`/api/client/servers/${daemonType}/${uuid}/databases`, {
        params: includePassword ? { include: 'password' } : undefined,
      })
      .then((response) =>
        resolve(
          (response.data.data || []).map((item: any) => rawDataToServerDatabase(item.attributes)),
        ),
      )
      .catch(reject);
  });
};

export const createServerDatabase = (
  uuid: string,
  data: { connectionsFrom: string; databaseName: string },
): Promise<ServerDatabase> => {
  return new Promise((resolve, reject) => {
    http
      .post(
        `/api/client/servers/${getGlobalDaemonType()}/${uuid}/databases`,
        { database: data.databaseName, remote: data.connectionsFrom },
        { params: { include: 'password' } },
      )
      .then((response) => resolve(rawDataToServerDatabase(response.data.attributes)))
      .catch(reject);
  });
};

export const deleteServerDatabase = (uuid: string, database: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    http
      .delete(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/databases/${database}`)
      .then(() => resolve())
      .catch(reject);
  });
};

export const rotateDatabasePassword = (
  uuid: string,
  database: string,
): Promise<ServerDatabase> => {
  const daemonType = getGlobalDaemonType();
  return new Promise((resolve, reject) => {
    http
      .post(`/api/client/${daemonType}/servers/${uuid}/databases/${database}/rotate-password`)
      .then((response) => resolve(rawDataToServerDatabase(response.data.attributes)))
      .catch(reject);
  });
};
