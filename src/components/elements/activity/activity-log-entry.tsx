import { formatDistanceToNowStrict } from 'date-fns';
import { Terminal } from 'lucide-react';

interface ActivityLog {
  id: string;
  event: string;
  isApi: boolean;
  ip: string | null;
  description: string | null;
  properties: Record<string, unknown>;
  hasAdditionalMetadata: boolean;
  timestamp: Date;
  relationships?: {
    actor?: {
      username?: string;
      image?: string;
    };
  };
}

interface Props {
  activity: ActivityLog;
  children?: React.ReactNode;
}

function formatObjectToIdentString(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(', ');
}

const ActivityLogEntry = ({ activity, children }: Props) => {
  const actor = activity.relationships?.actor;

  return (
    <div className='flex items-center py-2 px-3 border-b border-zinc-800/30 last:border-0 group hover:bg-zinc-800/20 transition-colors duration-150'>
      <div className='flex-shrink-0 w-8 h-8 rounded-full bg-zinc-600 overflow-hidden mr-3'>
        {actor?.image ? (
          <img src={actor.image} alt={actor.username || 'System'} className='w-full h-full object-cover' />
        ) : (
          <div className='w-full h-full flex items-center justify-center text-zinc-300 text-xs font-semibold'>
            {(actor?.username || 'S').charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2 text-sm'>
          <span className='font-medium text-zinc-100 truncate'>{actor?.username || 'System'}</span>
          <span className='text-zinc-500'>&#8226;</span>
          <span className='font-mono text-xs bg-zinc-800/50 text-zinc-300 px-2 py-1 rounded hover:bg-zinc-700/50 hover:text-brand transition-colors duration-150 truncate'>
            {activity.event}
          </span>

          <div className='flex items-center gap-1 ml-auto'>
            {activity.isApi && (
              <span className='text-xs bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded flex items-center gap-1'>
                <Terminal className='w-3 h-3' />
                API
              </span>
            )}
            {children}
          </div>
        </div>

        <div className='flex items-center gap-3 mt-1 text-xs text-zinc-400'>
          {activity.ip && (
            <span className='font-mono bg-zinc-800/30 px-1.5 py-0.5 rounded'>{activity.ip}</span>
          )}
          <span>{formatDistanceToNowStrict(activity.timestamp, { addSuffix: true })}</span>

          {!activity.hasAdditionalMetadata &&
            activity.properties &&
            Object.keys(activity.properties).length > 0 && (
              <span className='text-zinc-500 truncate max-w-xs'>
                {formatObjectToIdentString(activity.properties)}
              </span>
            )}
        </div>
      </div>
    </div>
  );
};

export default ActivityLogEntry;
