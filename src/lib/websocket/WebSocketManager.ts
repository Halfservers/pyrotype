import { EventEmitter } from 'events';
import Sockette from 'sockette';

export class Websocket extends EventEmitter {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private backoff = 5000;
  private socket: Sockette | null = null;
  private url: string | null = null;
  private token = '';

  connect(url: string): this {
    this.url = url;

    this.socket = new Sockette(`${this.url}`, {
      onmessage: (e: MessageEvent) => {
        try {
          const { event, args } = JSON.parse(e.data as string) as {
            event: string;
            args?: string[];
          };
          if (args) {
            this.emit(event, ...args);
          } else {
            this.emit(event);
          }
        } catch (ex) {
          console.warn('Failed to parse incoming websocket message.', ex);
        }
      },
      onopen: () => {
        if (this.timer) clearTimeout(this.timer);
        this.backoff = 5000;
        this.emit('SOCKET_OPEN');
        this.authenticate();
      },
      onreconnect: () => {
        this.emit('SOCKET_RECONNECT');
        this.authenticate();
      },
      onclose: () => this.emit('SOCKET_CLOSE'),
      onerror: (error: Event) => this.emit('SOCKET_ERROR', error),
    });

    this.timer = setTimeout(() => {
      this.backoff = this.backoff + 2500 >= 20000 ? 20000 : this.backoff + 2500;
      if (this.socket) this.socket.close();
      if (this.timer) clearTimeout(this.timer);

      this.connect(url);
    }, this.backoff);

    return this;
  }

  setToken(token: string, isUpdate = false): this {
    this.token = token;
    if (isUpdate) {
      this.authenticate();
    }
    return this;
  }

  authenticate(): void {
    if (this.url && this.token) {
      this.send('auth', this.token);
    }
  }

  close(code?: number, reason?: string): void {
    this.url = null;
    this.token = '';
    if (this.socket) this.socket.close(code, reason);
  }

  open(): void {
    if (this.socket) this.socket.open();
  }

  reconnect(): void {
    if (this.socket) this.socket.reconnect();
  }

  send(event: string, payload?: string | string[]): void {
    if (this.socket) {
      this.socket.send(
        JSON.stringify({
          event,
          args: Array.isArray(payload) ? payload : [payload],
        }),
      );
    }
  }
}
