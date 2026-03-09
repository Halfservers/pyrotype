import { api } from '@/lib/http';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';

interface WebsocketTokenResponse {
  token: string;
  socket: string;
}

export default async (server: string): Promise<WebsocketTokenResponse> => {
  const daemonType = getGlobalDaemonType();
  const data: any = await api.get(`/api/client/servers/${daemonType}/${server}/websocket`);
  return {
    token: data.data.token,
    socket: data.data.socket,
  };
};
