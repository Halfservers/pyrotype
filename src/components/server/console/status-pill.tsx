import { cn } from '@/lib/utils';

import { useServerStore } from '@/store/server';

export const StatusPill = () => {
  const status = useServerStore((state) => state.status);

  return (
    <div
      className={cn(
        'relative transition rounded-full pl-3 pr-3 py-2 flex items-center gap-1',
        status === 'offline' ? 'bg-red-400/25' : status === 'running' ? 'bg-green-400/25' : 'bg-yellow-400/25',
      )}
    >
      <div
        className={cn(
          'transition rounded-full h-4 w-4',
          status === 'offline' ? 'bg-red-500' : status === 'running' ? 'bg-green-500' : 'bg-yellow-500',
        )}
      />
      <div
        className={cn(
          'transition rounded-full h-4 w-4 animate-ping absolute top-2.5 opacity-45',
          status === 'offline' ? 'bg-red-500' : status === 'running' ? 'bg-green-500' : 'bg-yellow-500',
        )}
      />
      <div className='text-sm font-bold'>
        {status === 'offline'
          ? 'Offline'
          : status === 'running'
            ? 'Online'
            : status === 'stopping'
              ? 'Stopping'
              : status === 'starting'
                ? 'Starting'
                : 'Fetching'}
      </div>
    </div>
  );
};
