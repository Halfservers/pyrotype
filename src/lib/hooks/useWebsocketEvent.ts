import { useEffect, useRef } from 'react';

import type { SocketEvent } from '@/lib/websocket/events.ts';
import { useServerStore } from '@/store/server.ts';

export const useWebsocketEvent = (event: SocketEvent, callback: (data: string) => void): void => {
  const connected = useServerStore((state) => state.socketConnected);
  const instance = useServerStore((state) => state.socketInstance);
  const savedCallback = useRef<(data: string) => void>(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const eventListener = (data: string) => savedCallback.current(data);
    if (connected && instance) {
      instance.addListener(event, eventListener);
    }

    return () => {
      if (instance) instance.removeListener(event, eventListener);
    };
  }, [event, connected, instance]);
};
