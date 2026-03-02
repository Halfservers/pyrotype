import { format, formatDistanceToNow } from 'date-fns';

import { Checkbox } from '@/components/ui/checkbox';
import { usePermissions, useFlash } from '@/lib/hooks';
import BackupContextMenu from './backup-context-menu';
import type { UnifiedBackup } from '../use-unified-backups';

interface Props {
  backup: UnifiedBackup;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  isSelectable?: boolean;
  retryBackup: (backupUuid: string) => Promise<void>;
}

const BackupItem = ({ backup, isSelected = false, onToggleSelect, isSelectable = false, retryBackup }: Props) => {
  const { addFlash, clearFlashes } = useFlash();
  const [canCreate] = usePermissions(['backup.create']);
  const [canManage] = usePermissions(['backup.download', 'backup.restore', 'backup.delete']);

  const handleRetry = async () => {
    if (!backup.canRetry) return;
    try {
      clearFlashes('backup');
      await retryBackup(backup.uuid);
      addFlash({ type: 'success', title: 'Success', key: 'backup', message: 'Backup is being retried.' });
    } catch (error) {
      addFlash({ type: 'error', title: 'Error', key: 'backup', message: error instanceof Error ? error.message : 'Failed to retry backup.' });
    }
  };

  const getStatusIcon = () => {
    const isActive = backup.status === 'running' || backup.status === 'pending';
    if (isActive) {
      return <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white' />;
    } else if (backup.isLocked) {
      return (
        <svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='text-red-400'>
          <rect width='18' height='11' x='3' y='11' rx='2' ry='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/>
        </svg>
      );
    } else if (backup.status === 'completed' || backup.isSuccessful) {
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

  const getStatusBadge = () => {
    switch (backup.status) {
      case 'failed':
        return <span className='bg-red-500/20 border border-red-500/30 py-0.5 px-2 rounded text-red-300 text-xs font-medium'>Failed</span>;
      case 'pending':
        return <span className='bg-yellow-500/20 border border-yellow-500/30 py-0.5 px-2 rounded text-yellow-300 text-xs font-medium'>Pending</span>;
      case 'running':
        return <span className='bg-blue-500/20 border border-blue-500/30 py-0.5 px-2 rounded text-blue-300 text-xs font-medium'>Running ({backup.progress}%)</span>;
      case 'completed':
        if (backup.isDeletion) return null;
        return backup.isLiveOnly ? <span className='bg-green-500/20 border border-green-500/30 py-0.5 px-2 rounded text-green-300 text-xs font-medium'>Completed</span> : null;
      case 'cancelled':
        return <span className='bg-gray-500/20 border border-gray-500/30 py-0.5 px-2 rounded text-gray-300 text-xs font-medium'>Cancelled</span>;
      default:
        return null;
    }
  };

  const isActive = backup.status === 'running' || backup.status === 'pending';
  const showProgressBar = isActive || (backup.status === 'completed' && backup.isLiveOnly);

  const bytesToString = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KiB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GiB`;
  };

  return (
    <div className='bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] border border-[#ffffff12] rounded-xl p-4 hover:border-[#ffffff20] transition-all duration-150'>
      <div className='flex items-center gap-3 w-full'>
        <div className='flex-shrink-0 w-5'>
          {isSelectable && onToggleSelect ? (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          ) : (
            <div className='w-5 h-5' />
          )}
        </div>

        <div className='flex-shrink-0 w-9 h-9 rounded-lg bg-[#ffffff11] flex items-center justify-center'>
          {getStatusIcon()}
        </div>

        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-1.5'>
            {getStatusBadge()}
            <h3 className='text-sm font-medium text-zinc-100 truncate'>{backup.name}</h3>
            {backup.isAutomatic && (
              <span className='text-xs text-blue-400 font-medium bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded'>Automatic</span>
            )}
            {backup.isLocked && (
              <span className='text-xs text-red-400 font-medium bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded'>Locked</span>
            )}
          </div>

          {showProgressBar && (
            <div className='mb-2'>
              <div className='flex justify-between text-xs text-zinc-400 mb-1.5'>
                <span>{backup.message || 'Processing...'}</span>
                <span>{backup.progress}%</span>
              </div>
              <div className='w-full bg-zinc-700 rounded-full h-2'>
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${backup.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${backup.progress || 0}%` }}
                />
              </div>
            </div>
          )}

          {backup.status === 'failed' && backup.message && (
            <p className='text-xs text-red-400 truncate mb-1.5'>{backup.message}</p>
          )}

          {backup.checksum && <p className='text-xs text-zinc-400 font-mono truncate'>{backup.checksum}</p>}
        </div>

        <div className='hidden sm:block flex-shrink-0 text-right min-w-[90px]'>
          {backup.completedAt && backup.isSuccessful && backup.bytes ? (
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

        <div className='hidden sm:block flex-shrink-0 text-right min-w-[130px]'>
          <p className='text-xs text-zinc-500 uppercase tracking-wide mb-1'>Created</p>
          <p className='text-sm text-zinc-300 font-medium' title={format(backup.createdAt, 'PPPp')}>
            {formatDistanceToNow(backup.createdAt, { includeSeconds: true, addSuffix: true })}
          </p>
        </div>

        <div className='flex-shrink-0 flex items-center gap-2 min-w-[68px] justify-end'>
          {backup.status === 'failed' && backup.canRetry && canCreate && (
            <button
              onClick={handleRetry}
              className='p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors'
              title='Retry backup'
            >
              <svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2' />
              </svg>
            </button>
          )}

          {canManage && !isActive && !backup.isLiveOnly && (
            <BackupContextMenu backup={backup} />
          )}
        </div>
      </div>
    </div>
  );
};

export default BackupItem;
