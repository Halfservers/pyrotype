import { lazy, Suspense, useEffect, useRef } from 'react';

import ChartBlock from '@/components/server/console/chart-block';
import { useChart, useChartTickLabel, hexToRgba } from '@/components/server/console/chart';
import { SocketEvent } from '@/lib/websocket/events';
import { useServerStore } from '@/store/server';
import { useWebsocketEvent } from '@/lib/hooks';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const Line = lazy(() =>
  import('react-chartjs-2').then((mod) => ({ default: mod.Line })),
);

const bytesToString = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GiB`;
};

const StatGraphs = () => {
  const status = useServerStore((state) => state.status);
  const limits = useServerStore((state) => state.server?.limits);
  const previous = useRef<Record<'tx' | 'rx', number>>({ tx: -1, rx: -1 });

  const cpu = useChartTickLabel('CPU', limits?.cpu ?? 100, '%', 2);
  const memory = useChartTickLabel('Memory', limits?.memory ?? 1024, 'MiB');
  const network = useChart('Network', {
    sets: 2,
    options: {
      scales: {
        y: {
          ticks: {
            callback(value: string | number) {
              return bytesToString(typeof value === 'string' ? parseInt(value, 10) : (value as number));
            },
          },
        },
      },
    } as any,
    callback(opts, index) {
      return {
        ...opts,
        label: !index ? 'Network In' : 'Network Out',
        borderColor: !index ? '#facc15' : '#60a5fa',
        backgroundColor: hexToRgba(!index ? '#facc15' : '#60a5fa', 0.09),
      };
    },
  });

  useEffect(() => {
    if (status === 'offline') {
      cpu.clear();
      memory.clear();
      network.clear();
    }
  }, [status]);

  useWebsocketEvent(SocketEvent.STATS, (data: string) => {
    try {
      const values = JSON.parse(data);
      cpu.push(values.cpu_absolute);
      memory.push(Math.floor(values.memory_bytes / 1024 / 1024));
      network.push([
        previous.current.tx < 0 ? 0 : Math.max(0, values.network.tx_bytes - previous.current.tx),
        previous.current.rx < 0 ? 0 : Math.max(0, values.network.rx_bytes - previous.current.rx),
      ]);
      previous.current = { tx: values.network.tx_bytes, rx: values.network.rx_bytes };
    } catch {
      // ignore
    }
  });

  return (
    <TooltipProvider>
      <ChartBlock title='CPU'>
        <Suspense fallback={<div className='h-full animate-pulse bg-zinc-800 rounded' />}>
          <Line aria-label='CPU Usage' role='img' {...cpu.props} />
        </Suspense>
      </ChartBlock>
      <ChartBlock title='RAM'>
        <Suspense fallback={<div className='h-full animate-pulse bg-zinc-800 rounded' />}>
          <Line aria-label='Memory Usage' role='img' {...memory.props} />
        </Suspense>
      </ChartBlock>
      <ChartBlock
        title='Network Activity'
        legend={
          <div className='flex gap-2'>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className='flex items-center cursor-default'>
                  <svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='currentColor' className='mr-2 text-yellow-400'>
                    <path d='M12 16l-6-6h12z' />
                  </svg>
                </div>
              </TooltipTrigger>
              <TooltipContent side='top'>Inbound</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className='flex items-center cursor-default'>
                  <svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='currentColor' className='text-blue-400'>
                    <path d='M12 8l6 6H6z' />
                  </svg>
                </div>
              </TooltipTrigger>
              <TooltipContent side='top'>Outbound</TooltipContent>
            </Tooltip>
          </div>
        }
      >
        <Suspense fallback={<div className='h-full animate-pulse bg-zinc-800 rounded' />}>
          <Line aria-label='Network Activity' role='img' {...network.props} />
        </Suspense>
      </ChartBlock>
    </TooltipProvider>
  );
};

export default StatGraphs;
