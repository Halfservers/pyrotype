import http from '@/lib/api/http';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';

interface WebsocketTokenResponse {
  token: string;
  socket: string;
}

export default (server: string): Promise<WebsocketTokenResponse> => {
  const daemonType = getGlobalDaemonType();
  return new Promise((resolve, reject) => {
    http
      .get(`/api/client/servers/${daemonType}/${server}/websocket`)
      .then(({ data }) =>
        resolve({
          token: data.data.token,
          socket: data.data.socket,
        }),
      )
      .catch(reject);
  });
};
