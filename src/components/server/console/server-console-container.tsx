import { lazy, memo, Suspense, useEffect, useState } from 'react';
import isEqual from 'react-fast-compare';

import { ServerContentBlock } from '@/components/layout/page-header';
import Console from '@/components/server/console/console';
import PowerButtons from '@/components/server/console/power-buttons';
import ServerDetailsBlock from '@/components/server/console/server-details-block';
import { SocketEvent, SocketRequest } from '@/lib/websocket/events';
import { useServerStore } from '@/store/server';
import { useWebsocketEvent } from '@/lib/hooks';
import { Alert, AlertDescription } from '@/components/ui/alert';

const StatGraphs = lazy(() => import('@/components/server/console/stat-graphs'));

export type { PowerAction } from '@/components/server/console/power-buttons';

const UptimeDuration = (stats: { uptime: number }) => {
  const seconds = Math.floor(stats.uptime / 1000);
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
};

const ServerConsoleContainer = () => {
  const name = useServerStore((state) => state.server?.name ?? '');
  const description = useServerStore((state) => state.server?.description ?? '');
  const isTransferring = useServerStore((state) => state.server?.isTransferring ?? false);
  const isNodeUnderMaintenance = useServerStore((state) => state.server?.isNodeUnderMaintenance ?? false);
  const connected = useServerStore((state) => state.socketConnected);
  const instance = useServerStore((state) => state.socketInstance);
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    if (!connected || !instance) return;
    instance.send(SocketRequest.SEND_STATS);
  }, [instance, connected]);

  useWebsocketEvent(SocketEvent.STATS, (data: string) => {
    try {
      const stats = JSON.parse(data);
      setUptime(stats.uptime || 0);
    } catch {
      // ignore
    }
  });

  return (
    <ServerContentBlock title='Home'>
      <div className='w-full h-full min-h-full flex-1 flex flex-col px-2 sm:px-0'>
        {(isNodeUnderMaintenance || isTransferring) && (
          <div className='mb-3 sm:mb-4'>
            <Alert variant='destructive'>
              <AlertDescription>
                {isNodeUnderMaintenance
                  ? 'The node of this server is currently under maintenance and all actions are unavailable.'
                  : 'This server is currently being transferred to another node and all actions are unavailable.'}
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className='mb-3 sm:mb-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-2xl font-bold text-white'>{name}</h1>
              <p className='text-zinc-300 text-sm mt-1'>
                Uptime: {UptimeDuration({ uptime })}
              </p>
            </div>
            <PowerButtons className='flex gap-1 items-center justify-center' />
          </div>
        </div>

        {description && (
          <div className='mb-3 sm:mb-4'>
            <div className='bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] border border-[#ffffff12] rounded-xl p-3 sm:p-4 hover:border-[#ffffff20] transition-all duration-150 shadow-sm'>
              <p className='text-sm text-zinc-300 leading-relaxed'>{description}</p>
            </div>
          </div>
        )}

        <div className='flex flex-col gap-3 sm:gap-4'>
          <div className='bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] border border-[#ffffff12] rounded-xl p-3 sm:p-4 hover:border-[#ffffff20] transition-all duration-150 shadow-sm'>
            <ServerDetailsBlock />
          </div>

          <div className='bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] border border-[#ffffff12] rounded-xl p-3 sm:p-4 hover:border-[#ffffff20] transition-all duration-150 shadow-sm'>
            <Console />
          </div>

          <div className='bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] border border-[#ffffff12] rounded-xl p-3 sm:p-4 hover:border-[#ffffff20] transition-all duration-150 shadow-sm'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4'>
              <Suspense fallback={<div className='h-48 animate-pulse bg-zinc-800 rounded col-span-3' />}>
                <StatGraphs />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </ServerContentBlock>
  );
};

export default memo(ServerConsoleContainer, isEqual);
