import { format, formatDistanceToNow } from 'date-fns';

import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import { usePermissions } from '@/lib/hooks';
import { useWebsocketEvent } from '@/lib/hooks';
import { SocketEvent } from '@/lib/websocket/events';
import { useServerBackupsQuery } from '@/lib/queries/hooks';
import { useServerStore } from '@/store/server';
import BackupContextMenu from './backup-context-menu';

import type { ServerBackup } from '@/lib/api/transformers';

interface Props {
  backup: ServerBackup;
}

const bytesToString = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GiB`;
};

const BackupItem = ({ backup }: Props) => {
  const uuid = useServerStore((state) => state.server?.uuid ?? '');
  const { refetch } = useServerBackupsQuery(uuid);
  const [canManage] = usePermissions(['backup.download', 'backup.restore', 'backup.delete']);

  useWebsocketEvent(SocketEvent.BACKUP_COMPLETED, async (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.backup_uuid === backup.uuid) {
        refetch();
      }
    } catch {
      // ignore
    }
  });

  const getStatusIcon = () => {
    if (backup.completedAt === null) {
      return <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white' />;
    } else if (backup.isLocked) {
      return (
        <svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='text-red-400'>
          <rect width='18' height='11' x='3' y='11' rx='2' ry='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/>
        </svg>
      );
    } else if (backup.isSuccessful) {
      return (
        <svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='text-green-400'>
          <path d='M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z'/>
        </svg>
      );
    }
    return (
      <svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='text-red-400'>
        <path d='M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z'/>
      </svg>
    );
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div className='bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] border border-[#ffffff12] rounded-xl p-4 hover:border-[#ffffff20] transition-all duration-150'>
          <div className='flex items-center gap-3 w-full'>
            <div className='flex flex-row align-middle items-center gap-6 truncate'>
              <div className='flex-shrink-0 w-9 h-9 rounded-lg bg-[#ffffff11] flex items-center justify-center'>
                {getStatusIcon()}
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2 mb-1.5'>
                  <h3 className='text-sm font-medium text-zinc-100 truncate'>{backup.name}</h3>
                  {backup.isAutomatic && (
                    <span className='text-xs text-blue-400 font-medium bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded'>Automatic</span>
                  )}
                  {backup.isLocked && (
                    <span className='text-xs text-red-400 font-medium bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded'>Locked</span>
                  )}
                </div>
                {backup.checksum && <p className='text-xs text-zinc-400 font-mono truncate'>{backup.checksum}</p>}
              </div>
            </div>

            <div className='hidden sm:block flex-shrink-0 text-right min-w-[90px]'>
              {backup.completedAt && backup.bytes ? (
                <>
                  <p className='text-xs text-zinc-500 uppercase tracking-wide mb-1'>Size</p>
                  <p className='text-sm text-zinc-300 font-medium'>{bytesToString(backup.bytes)}</p>
                </>
              ) : (
                <>
                  <p className='text-xs text-transparent uppercase tracking-wide mb-1'>Size</p>
                  <p className='text-sm text-transparent font-medium'>-</p>
                </>
              )}
            </div>

            <div className='hidden sm:block flex-shrink-0 text-right min-w-[130px] mr-5'>
              <p className='text-xs text-zinc-500 uppercase tracking-wide mb-1'>Created</p>
              <p className='text-sm text-zinc-300 font-medium' title={format(backup.createdAt, 'PPPp')}>
                {formatDistanceToNow(backup.createdAt, { includeSeconds: true, addSuffix: true })}
              </p>
            </div>

            {canManage && backup.completedAt && <BackupContextMenu backup={backup} />}
          </div>
        </div>
      </ContextMenuTrigger>
    </ContextMenu>
  );
};

export default BackupItem;
