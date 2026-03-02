import { useRef } from 'react';

import type { ServerStore } from '@/store/server.ts';
import { ServerStoreContext, createServerStore } from '@/store/server.ts';

export function ServerStoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<ServerStore>(undefined);
  if (!storeRef.current) {
    storeRef.current = createServerStore();
  }
  return <ServerStoreContext.Provider value={storeRef.current}>{children}</ServerStoreContext.Provider>;
}
