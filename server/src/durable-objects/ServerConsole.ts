import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types/env';

interface ServerMeta {
  serverUuid: string;
  nodeUrl: string;
  daemonSecret: string;
  daemonType: 'wings' | 'elytra';
}

/**
 * Durable Object that proxies WebSocket console connections between
 * browser clients and a Wings/Elytra daemon. One DO instance per server UUID.
 *
 * Uses the WebSocket Hibernation API so the DO can sleep when no
 * browsers are connected, keeping costs low.
 *
 * Flow:
 *  1. Browser connects via WebSocket upgrade to this DO.
 *  2. DO accepts the WebSocket with ctx.acceptWebSocket().
 *  3. If no daemon connection exists, DO fetches a WebSocket token
 *     from the Wings/Elytra REST API and opens a persistent WebSocket.
 *  4. Daemon messages are fanned out to ALL connected browser sockets.
 *  5. Browser input (commands) are forwarded to the daemon socket.
 *  6. When the last browser disconnects, the daemon socket is closed.
 */
export class ServerConsole extends DurableObject<Env> {
  private daemonSocket: WebSocket | null = null;
  private meta: ServerMeta | null = null;

  /**
   * HTTP fetch handler — only accepts WebSocket upgrade requests.
   * Query params carry the server metadata needed to reach the daemon.
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const upgradeHeader = request.headers.get('Upgrade');

    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // Extract server metadata from query params (set by the route handler)
    const serverUuid = url.searchParams.get('server_uuid') ?? '';
    const nodeUrl = url.searchParams.get('node_url') ?? '';
    const daemonSecret = url.searchParams.get('daemon_secret') ?? '';
    const daemonType = (url.searchParams.get('daemon_type') ?? 'elytra') as 'wings' | 'elytra';

    if (!serverUuid || !nodeUrl || !daemonSecret) {
      return new Response('Missing server metadata', { status: 400 });
    }

    this.meta = { serverUuid, nodeUrl, daemonSecret, daemonType };

    // Accept the browser WebSocket using the Hibernation API
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    this.ctx.acceptWebSocket(server);

    // Ensure we have a live daemon connection
    await this.ensureDaemonConnection();

    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Hibernation handler — called when a browser client sends a message.
   * Forwards the message to the daemon socket.
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (!this.daemonSocket || this.daemonSocket.readyState !== WebSocket.READY_STATE_OPEN) {
      // Try to re-establish daemon connection
      await this.ensureDaemonConnection();
    }

    if (this.daemonSocket && this.daemonSocket.readyState === WebSocket.READY_STATE_OPEN) {
      this.daemonSocket.send(message);
    }
  }

  /**
   * Hibernation handler — called when a browser client disconnects.
   * If no browsers remain, close the daemon connection to save resources.
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    ws.close(code, reason);

    const remaining = this.ctx.getWebSockets();
    if (remaining.length === 0) {
      this.closeDaemonConnection();
    }
  }

  /**
   * Hibernation handler — called on WebSocket error.
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    ws.close(1011, 'Unexpected error');

    const remaining = this.ctx.getWebSockets();
    if (remaining.length === 0) {
      this.closeDaemonConnection();
    }
  }

  /**
   * Opens a WebSocket to the Wings/Elytra daemon if one is not already open.
   * First fetches a short-lived token via the daemon REST API, then connects.
   */
  private async ensureDaemonConnection(): Promise<void> {
    if (this.daemonSocket && this.daemonSocket.readyState === WebSocket.READY_STATE_OPEN) {
      return;
    }

    if (!this.meta) {
      return;
    }

    const { nodeUrl, daemonSecret, serverUuid, daemonType } = this.meta;

    // Fetch a WebSocket token from the daemon
    const tokenUrl = daemonType === 'wings'
      ? `${nodeUrl}/api/servers/${serverUuid}/ws`
      : `${nodeUrl}/api/servers/${serverUuid}/ws`;

    const tokenResponse = await fetch(tokenUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${daemonSecret}`,
        'Content-Type': 'application/json',
      },
    });

    if (!tokenResponse.ok) {
      this.broadcastToBrowsers(JSON.stringify({
        event: 'daemon_error',
        args: [`Failed to obtain daemon WebSocket token: ${tokenResponse.status}`],
      }));
      return;
    }

    const tokenData = await tokenResponse.json() as { data: { token: string; socket: string } };
    const wsUrl = tokenData.data.socket;
    const token = tokenData.data.token;

    // Open WebSocket to daemon
    const daemonWsUrl = `${wsUrl}?token=${encodeURIComponent(token)}`;
    const resp = await fetch(daemonWsUrl, {
      headers: { Upgrade: 'websocket' },
    });

    const daemonSocket = resp.webSocket;
    if (!daemonSocket) {
      this.broadcastToBrowsers(JSON.stringify({
        event: 'daemon_error',
        args: ['Failed to establish daemon WebSocket connection'],
      }));
      return;
    }

    daemonSocket.accept();
    this.daemonSocket = daemonSocket;

    // Fan out daemon messages to all connected browser clients
    daemonSocket.addEventListener('message', (event) => {
      this.broadcastToBrowsers(event.data as string);
    });

    daemonSocket.addEventListener('close', () => {
      this.daemonSocket = null;
      this.broadcastToBrowsers(JSON.stringify({
        event: 'daemon_error',
        args: ['Daemon connection closed'],
      }));
    });

    daemonSocket.addEventListener('error', () => {
      this.daemonSocket = null;
    });
  }

  /**
   * Sends a message to every connected browser WebSocket.
   */
  private broadcastToBrowsers(message: string): void {
    const sockets = this.ctx.getWebSockets();
    for (const ws of sockets) {
      try {
        ws.send(message);
      } catch {
        // Socket may already be closed; ignore
      }
    }
  }

  /**
   * Closes the daemon WebSocket connection.
   */
  private closeDaemonConnection(): void {
    if (this.daemonSocket) {
      try {
        this.daemonSocket.close(1000, 'No browsers connected');
      } catch {
        // Already closed
      }
      this.daemonSocket = null;
    }
  }
}
