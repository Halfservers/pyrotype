import { createContext, lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { ServerContentBlock } from '@/components/layout/page-header';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useFlash, usePermissions, useWebsocketEvent } from '@/lib/hooks';
import { SocketEvent } from '@/lib/websocket/events';
import { useServerStore } from '@/store/server';
import { useAppStore } from '@/store';

import { httpErrorToHuman } from '@/lib/api/http';
import { deleteAllServerBackups } from '@/lib/api/server/backups';

import { useUnifiedBackups } from './use-unified-backups';

const BackupItemElytra = lazy(() => import('./elytra/backup-item'));

export const LiveProgressContext = createContext<
  Record<
    string,
    {
      status: string;
      progress: number;
      message: string;
      canRetry: boolean;
      lastUpdated: string;
      completed: boolean;
      isDeletion: boolean;
      backupName?: string;
    }
  >
>({});

interface BackupValues {
  name: string;
  ignored: string;
  isLocked: boolean;
}

const BackupContainer = () => {
  const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [deleteAllModalVisible, setDeleteAllModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteAllPassword, setDeleteAllPassword] = useState('');
  const [deleteAllTotpCode, setDeleteAllTotpCode] = useState('');
  const [selectedBackups, setSelectedBackups] = useState<Set<string>>(new Set());
  const [bulkDeleteModalVisible, setBulkDeleteModalVisible] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeletePassword, setBulkDeletePassword] = useState('');
  const [bulkDeleteTotpCode, setBulkDeleteTotpCode] = useState('');

  const hasTwoFactor = useAppStore((state) => state.userData?.useTotp || false);
  const [canCreate] = usePermissions(['backup.create']);
  const [canDelete] = usePermissions(['backup.delete']);

  const { backups, backupCount, error, isValidating, createBackup, retryBackup, refresh } =
    useUnifiedBackups();

  const uuid = useServerStore((state) => state.server?.uuid ?? '');
  const backupLimit = useServerStore((state) => state.server?.featureLimits?.backups ?? 0);

  const { register, handleSubmit, reset, formState: { isSubmitting }, setValue, watch } = useForm<BackupValues>({
    defaultValues: { name: '', ignored: '', isLocked: false },
  });
  const isLocked = watch('isLocked');

  useEffect(() => {
    clearFlashes('backups:create');
  }, [createModalVisible]);

  const submitBackup = async (values: BackupValues) => {
    clearFlashes('backups:create');
    try {
      await createBackup(values.name, values.ignored, values.isLocked);
      clearFlashes('backups');
      setCreateModalVisible(false);
      reset();
    } catch (error) {
      clearAndAddHttpError({ key: 'backups:create', error });
    }
  };

  const handleDeleteAll = async () => {
    if (!deleteAllPassword) { toast.error('Password is required.'); return; }
    if (hasTwoFactor && !deleteAllTotpCode) { toast.error('Two-factor code is required.'); return; }

    setIsDeleting(true);
    try {
      await deleteAllServerBackups(uuid, deleteAllPassword, hasTwoFactor, deleteAllTotpCode);
      toast.success('All backups are being deleted.');
      setDeleteAllModalVisible(false);
      setDeleteAllPassword('');
      setDeleteAllTotpCode('');
    } catch (error) {
      toast.error(httpErrorToHuman(error));
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleBackupSelection = (backupUuid: string) => {
    setSelectedBackups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(backupUuid)) newSet.delete(backupUuid);
      else newSet.add(backupUuid);
      return newSet;
    });
  };

  const selectableBackups = backups.filter((b) => b.status === 'completed' && b.isSuccessful && !b.isLiveOnly);

  const toggleSelectAll = () => {
    if (selectedBackups.size === selectableBackups.length) setSelectedBackups(new Set());
    else setSelectedBackups(new Set(selectableBackups.map((b) => b.uuid)));
  };

  const handleBulkDelete = async () => {
    if (!bulkDeletePassword) { addFlash({ key: 'backups:bulk_delete', type: 'error', message: 'Password is required.' }); return; }
    if (hasTwoFactor && !bulkDeleteTotpCode) { addFlash({ key: 'backups:bulk_delete', type: 'error', message: 'Two-factor code is required.' }); return; }

    setIsBulkDeleting(true);
    clearFlashes('backups:bulk_delete');
    try {
      const http = (await import('@/lib/api/http')).default;
      await http.post(`/api/client/servers/${uuid}/backups/bulk-delete`, {
        backup_uuids: Array.from(selectedBackups),
        password: bulkDeletePassword,
        ...(hasTwoFactor ? { totp_code: bulkDeleteTotpCode } : {}),
      });
      addFlash({ key: 'backups', type: 'success', message: `${selectedBackups.size} backup(s) are being deleted.` });
      setBulkDeleteModalVisible(false);
      setBulkDeletePassword('');
      setBulkDeleteTotpCode('');
      setSelectedBackups(new Set());
      await refresh();
    } catch (error) {
      clearAndAddHttpError({ key: 'backups:bulk_delete', error });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  useEffect(() => {
    if (!error) { clearFlashes('backups'); return; }
    clearAndAddHttpError({ error, key: 'backups' });
  }, [error]);

  if (!backups || (error && isValidating)) {
    return (
      <ServerContentBlock title='Backups'>
        <h2 className='text-xl font-bold mb-2'>Backups</h2>
        <p className='text-sm text-neutral-400 mb-6'>Create and manage server backups.</p>
        <div className='flex items-center justify-center py-12'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-brand' />
        </div>
      </ServerContentBlock>
    );
  }

  return (
    <ServerContentBlock title='Backups'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h2 className='text-xl font-bold'>Backups</h2>
          <p className='text-sm text-neutral-400 leading-relaxed mt-1'>
            Create and manage server backups to protect your data.
          </p>
        </div>
        {canCreate && (
          <div className='flex gap-2'>
            {backupCount > 0 && (
              <Button variant='destructive' onClick={() => setDeleteAllModalVisible(true)}>Delete All</Button>
            )}
            {(backupLimit === null || backupLimit > backupCount) && (
              <Button onClick={() => setCreateModalVisible(true)}>New Backup</Button>
            )}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Dialog open={createModalVisible} onOpenChange={(open) => { if (!open) { setCreateModalVisible(false); reset(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create server backup</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(submitBackup)} className='flex flex-col gap-4'>
            <div>
              <Label htmlFor='backup-name'>Backup name</Label>
              <Input id='backup-name' {...register('name')} />
            </div>
            <div>
              <Label htmlFor='backup-ignored'>Ignored Files & Directories</Label>
              <Textarea id='backup-ignored' {...register('ignored')} rows={4} />
            </div>
            {canDelete && (
              <div className='flex items-center gap-2'>
                <Switch checked={isLocked} onCheckedChange={(checked) => setValue('isLocked', checked)} />
                <Label>Locked (prevents deletion)</Label>
              </div>
            )}
            <div className='flex justify-end'>
              <Button type='submit' disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Start backup'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete all modal */}
      <Dialog open={deleteAllModalVisible} onOpenChange={(open) => { if (!open) { setDeleteAllModalVisible(false); setDeleteAllPassword(''); setDeleteAllTotpCode(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete All Backups</DialogTitle></DialogHeader>
          <div className='space-y-4'>
            <p className='text-sm text-zinc-300'>You are about to permanently delete <span className='text-red-400 font-medium'>{backupCount} backup(s)</span>.</p>
            <div className='p-4 bg-red-500/10 border border-red-500/20 rounded-lg'>
              <p className='font-medium text-red-300 text-sm'>This action cannot be undone</p>
            </div>
            <div>
              <Label htmlFor='deleteall-password'>Password</Label>
              <Input id='deleteall-password' type='password' value={deleteAllPassword} onChange={(e) => setDeleteAllPassword(e.target.value)} disabled={isDeleting} />
            </div>
            {hasTwoFactor && (
              <div>
                <Label htmlFor='deleteall-totp'>Two-Factor Code</Label>
                <Input id='deleteall-totp' type='text' maxLength={6} value={deleteAllTotpCode} onChange={(e) => setDeleteAllTotpCode(e.target.value.replace(/[^0-9]/g, ''))} disabled={isDeleting} />
              </div>
            )}
            <div className='flex justify-end gap-3'>
              <Button variant='secondary' onClick={() => { setDeleteAllModalVisible(false); setDeleteAllPassword(''); setDeleteAllTotpCode(''); }} disabled={isDeleting}>Cancel</Button>
              <Button variant='destructive' onClick={handleDeleteAll} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete All Backups'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk delete modal */}
      <Dialog open={bulkDeleteModalVisible} onOpenChange={(open) => { if (!open) { setBulkDeleteModalVisible(false); setBulkDeletePassword(''); setBulkDeleteTotpCode(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Selected Backups</DialogTitle></DialogHeader>
          <div className='space-y-4'>
            <p className='text-sm text-zinc-300'>You are about to permanently delete <span className='text-red-400 font-medium'>{selectedBackups.size} backup(s)</span>.</p>
            <div>
              <Label htmlFor='bulk-password'>Password</Label>
              <Input id='bulk-password' type='password' value={bulkDeletePassword} onChange={(e) => setBulkDeletePassword(e.target.value)} disabled={isBulkDeleting} />
            </div>
            {hasTwoFactor && (
              <div>
                <Label htmlFor='bulk-totp'>Two-Factor Code</Label>
                <Input id='bulk-totp' type='text' maxLength={6} value={bulkDeleteTotpCode} onChange={(e) => setBulkDeleteTotpCode(e.target.value.replace(/[^0-9]/g, ''))} disabled={isBulkDeleting} />
              </div>
            )}
            <div className='flex justify-end gap-3'>
              <Button variant='secondary' onClick={() => { setBulkDeleteModalVisible(false); setBulkDeletePassword(''); setBulkDeleteTotpCode(''); }} disabled={isBulkDeleting}>Cancel</Button>
              <Button variant='destructive' onClick={handleBulkDelete} disabled={isBulkDeleting}>{isBulkDeleting ? 'Deleting...' : `Delete ${selectedBackups.size} Backup(s)`}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {backups.length === 0 ? (
        <div className='flex flex-col items-center justify-center min-h-[60vh] py-12 px-4'>
          <div className='text-center'>
            <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-[#ffffff11] flex items-center justify-center'>
              <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='text-zinc-400'>
                <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' x2='12' y1='15' y2='3'/>
              </svg>
            </div>
            <h3 className='text-lg font-medium text-zinc-200 mb-2'>
              {backupLimit === 0 ? 'Backups unavailable' : 'No backups found'}
            </h3>
            <p className='text-sm text-zinc-400 max-w-sm'>
              {backupLimit === 0 ? 'Backups cannot be created for this server.' : 'Your server does not have any backups. Create one to get started.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {selectableBackups.length > 0 && (
            <div className='mb-4 flex items-center justify-between px-4 py-3.5 rounded-xl bg-[#ffffff08] border border-zinc-700'>
              <div className='flex items-center gap-4'>
                <Checkbox
                  checked={selectedBackups.size === selectableBackups.length && selectableBackups.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className='text-sm text-zinc-300'>
                  {selectedBackups.size > 0 ? <><span className='font-medium'>{selectedBackups.size}</span> selected</> : 'Select backups'}
                </span>
              </div>
              <div className={`flex items-center gap-3 transition-opacity ${selectedBackups.size > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <Button variant='secondary' onClick={() => setSelectedBackups(new Set())}>Clear</Button>
                {canDelete && (
                  <Button variant='destructive' onClick={() => setBulkDeleteModalVisible(true)}>Delete Selected ({selectedBackups.size})</Button>
                )}
              </div>
            </div>
          )}

          <div className='flex flex-col gap-3'>
            <Suspense fallback={<div className='h-48 animate-pulse bg-zinc-800 rounded' />}>
              {backups.map((backup) => (
                <BackupItemElytra
                  key={backup.uuid}
                  backup={backup}
                  isSelected={selectedBackups.has(backup.uuid)}
                  onToggleSelect={() => toggleBackupSelection(backup.uuid)}
                  isSelectable={selectableBackups.some((b) => b.uuid === backup.uuid)}
                  retryBackup={retryBackup}
                />
              ))}
            </Suspense>
          </div>
        </>
      )}
    </ServerContentBlock>
  );
};

const BackupContainerWrapper = () => {
  const [liveProgress, setLiveProgress] = useState<
    Record<string, { status: string; progress: number; message: string; canRetry: boolean; lastUpdated: string; completed: boolean; isDeletion: boolean; backupName?: string; }>
  >({});

  const handleBackupStatus = useCallback((rawData: string) => {
    let data: any;
    try {
      data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    } catch { return; }

    const backup_uuid = data?.backup_uuid;
    if (!backup_uuid) return;

    const { status, progress, message, timestamp, operation, error: errorMsg, name } = data;
    const can_retry = status === 'failed' && operation === 'create';
    const last_updated_at = timestamp ? new Date(timestamp * 1000).toISOString() : new Date().toISOString();
    const isDeletionOperation = operation === 'delete' || data.deleted === true;

    setLiveProgress((prev) => {
      const current = prev[backup_uuid];
      const newProgress = progress || 0;
      const isCompleted = status === 'completed' && newProgress === 100;
      const displayMessage = errorMsg ? `${message || 'Operation failed'}: ${errorMsg}` : message || '';

      if (current?.completed && !isCompleted) return prev;
      if (current && !isCompleted && current.lastUpdated >= last_updated_at && current.progress >= newProgress) return prev;

      return {
        ...prev,
        [backup_uuid]: {
          status,
          progress: newProgress,
          message: displayMessage,
          canRetry: can_retry || false,
          lastUpdated: last_updated_at,
          completed: isCompleted,
          isDeletion: isDeletionOperation,
          backupName: name || current?.backupName,
        },
      };
    });

    if (status === 'completed' && progress === 100) {
      if (isDeletionOperation) {
        setLiveProgress((prev) => {
          const updated = { ...prev };
          delete updated[backup_uuid];
          return updated;
        });
      } else {
        setTimeout(() => {
          setLiveProgress((prev) => {
            const updated = { ...prev };
            delete updated[backup_uuid];
            return updated;
          });
        }, 3000);
      }
    }
  }, []);

  useWebsocketEvent(SocketEvent.BACKUP_STATUS, handleBackupStatus);

  return (
    <LiveProgressContext.Provider value={liveProgress}>
      <BackupContainer />
    </LiveProgressContext.Provider>
  );
};

export default BackupContainerWrapper;
