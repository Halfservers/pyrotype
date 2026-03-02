import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

import StatBlock from '@/components/server/console/stat-block';
import { SocketEvent, SocketRequest } from '@/lib/websocket/events';
import { useServerStore } from '@/store/server';
import { useWebsocketEvent } from '@/lib/hooks';

type Stats = Record<'memory' | 'cpu' | 'disk' | 'uptime' | 'rx' | 'tx', number>;

const bytesToString = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GiB`;
};

const ip = (address: string): string => {
  if (address.startsWith('::ffff:')) return address.substring(7);
  return address;
};

const ServerDetailsBlock = ({ className }: { className?: string }) => {
  const [stats, setStats] = useState<Stats>({ memory: 0, cpu: 0, disk: 0, uptime: 0, tx: 0, rx: 0 });

  const status = useServerStore((state) => state.status);
  const connected = useServerStore((state) => state.socketConnected);
  const instance = useServerStore((state) => state.socketInstance);
  const allocations = useServerStore((state) => state.server?.allocations ?? []);

  const allocation = useMemo(() => {
    const match = allocations.find((a) => a.isDefault);
    return !match ? 'n/a' : `${match.alias || ip(match.ip)}:${match.port}`;
  }, [allocations]);

  useEffect(() => {
    if (!connected || !instance) return;
    instance.send(SocketRequest.SEND_STATS);
  }, [instance, connected]);

  useWebsocketEvent(SocketEvent.STATS, (data: string) => {
    try {
      const parsed = JSON.parse(data);
      setStats({
        memory: parsed.memory_bytes,
        cpu: parsed.cpu_absolute,
        disk: parsed.disk_bytes,
        tx: parsed.network.tx_bytes,
        rx: parsed.network.rx_bytes,
        uptime: parsed.uptime || 0,
      });
    } catch {
      // ignore parse errors
    }
  });

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      <StatBlock title='IP Address' copyOnClick={allocation}>
        {allocation}
      </StatBlock>
      <StatBlock title='CPU'>
        {status === 'offline' ? (
          <span className='text-zinc-400'>Offline</span>
        ) : (
          <>{stats.cpu.toFixed(2)}%</>
        )}
      </StatBlock>
      <StatBlock title='RAM'>
        {status === 'offline' ? (
          <span className='text-zinc-400'>Offline</span>
        ) : (
          <>{bytesToString(stats.memory)}</>
        )}
      </StatBlock>
      <StatBlock title='Storage'>
        {bytesToString(stats.disk)}
      </StatBlock>
    </div>
  );
};

export default ServerDetailsBlock;
