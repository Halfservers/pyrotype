import { useEffect, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFlash, usePermissions } from '@/lib/hooks';
import { useServerStore } from '@/store/server';
import { useAppStore } from '@/store';

import { httpErrorToHuman } from '@/lib/api/http';
import { getServerBackupDownloadUrl } from '@/lib/api/server/backups';
import { useUnifiedBackups } from '../use-unified-backups';

import type { UnifiedBackup } from '../use-unified-backups';

interface Props {
  backup: UnifiedBackup;
}

const BackupContextMenu = ({ backup }: Props) => {
  const uuid = useServerStore((state) => state.server?.uuid ?? '');
  const [modal, setModal] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [newName, setNewName] = useState(backup.name);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteTotpCode, setDeleteTotpCode] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreTotpCode, setRestoreTotpCode] = useState('');
  const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();
  const { renameBackup, toggleBackupLock, refresh } = useUnifiedBackups();
  const hasTwoFactor = useAppStore((state) => state.userData?.useTotp || false);

  const [canDownload] = usePermissions(['backup.download']);
  const [canRestore] = usePermissions(['backup.restore']);
  const [canDelete] = usePermissions(['backup.delete']);

  const doDownload = () => {
    setLoading(true);
    clearFlashes('backups');
    getServerBackupDownloadUrl(uuid, backup.uuid)
      .then((url: string) => { window.location.href = url; })
      .catch((error: unknown) => clearAndAddHttpError({ key: 'backups', error }))
      .then(() => setLoading(false));
  };

  const doDeletion = async () => {
    if (!deletePassword) {
      addFlash({ key: 'backup:delete', type: 'error', message: 'Password is required to delete this backup.' });
      return;
    }
    if (hasTwoFactor && !deleteTotpCode) {
      addFlash({ key: 'backup:delete', type: 'error', message: 'Two-factor authentication code is required.' });
      return;
    }

    setLoading(true);
    clearFlashes('backup:delete');
    try {
      const http = (await import('@/lib/api/http')).default;
      await http.delete(`/api/client/servers/${uuid}/backups/${backup.uuid}`, {
        data: { password: deletePassword, ...(hasTwoFactor ? { totp_code: deleteTotpCode } : {}) },
      });
      setLoading(false);
      setModal('');
      setDeletePassword('');
      setDeleteTotpCode('');
      await refresh();
    } catch (error) {
      clearAndAddHttpError({ key: 'backup:delete', error });
      setLoading(false);
    }
  };

  const doRestorationAction = async () => {
    if (!restorePassword) {
      addFlash({ key: 'backup:restore', type: 'error', message: 'Password is required to restore this backup.' });
      return;
    }
    if (hasTwoFactor && !restoreTotpCode) {
      addFlash({ key: 'backup:restore', type: 'error', message: 'Two-factor authentication code is required.' });
      return;
    }

    setLoading(true);
    clearFlashes('backup:restore');
    try {
      const http = (await import('@/lib/api/http')).default;
      await http.post(`/api/client/servers/${uuid}/backups/${backup.uuid}/restore`, {
        password: restorePassword,
        ...(hasTwoFactor ? { totp_code: restoreTotpCode } : {}),
      });
      setLoading(false);
      setModal('');
      setRestorePassword('');
      setRestoreTotpCode('');
    } catch (error) {
      clearAndAddHttpError({ key: 'backup:restore', error });
      setLoading(false);
    }
  };

  const onLockToggle = async () => {
    if (backup.isLocked && modal !== 'unlock') return setModal('unlock');
    try {
      await toggleBackupLock(backup.uuid);
      setModal('');
    } catch (error) {
      alert(httpErrorToHuman(error));
    }
  };

  const doRename = async () => {
    setLoading(true);
    clearFlashes('backups');
    try {
      await renameBackup(backup.uuid, newName.trim());
      setLoading(false);
      setModal('');
    } catch (error) {
      clearAndAddHttpError({ key: 'backups', error });
      setLoading(false);
      setModal('');
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (modal === 'restore' && countdown > 0) {
      interval = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [modal, countdown]);

  useEffect(() => { if (modal === 'restore') setCountdown(5); }, [modal]);
  useEffect(() => { if (modal === 'rename') setNewName(backup.name); }, [modal, backup.name]);

  return (
    <>
      {/* Rename dialog */}
      <Dialog open={modal === 'rename'} onOpenChange={(open) => !open && setModal('')}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Backup</DialogTitle></DialogHeader>
          <div>
            <Label>Backup Name</Label>
            <Input type='text' value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={191} />
          </div>
          <DialogFooter>
            <Button variant='secondary' onClick={() => setModal('')}>Cancel</Button>
            <Button onClick={doRename} disabled={!newName.trim() || newName.trim() === backup.name}>Rename Backup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock confirmation */}
      <AlertDialog open={modal === 'unlock'} onOpenChange={(open) => !open && setModal('')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock &quot;{backup.name}&quot;</AlertDialogTitle>
            <AlertDialogDescription>This backup will no longer be protected from automated or accidental deletions.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onLockToggle}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore dialog */}
      <Dialog open={modal === 'restore'} onOpenChange={(open) => { if (!open) { setModal(''); setRestorePassword(''); setRestoreTotpCode(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Restore Backup</DialogTitle></DialogHeader>
          <div className='space-y-4'>
            <p className='text-sm text-zinc-400'>Your server will be stopped during the restoration process.</p>
            <div className='p-4 bg-red-500/10 border border-red-500/20 rounded-lg'>
              <p className='text-sm text-red-300 font-medium'>Destructive Action - Complete Server Restore</p>
              <p className='text-xs text-red-400 mt-1'>All current files will be deleted and replaced with the backup data.</p>
            </div>
            <div>
              <Label htmlFor='restore-password'>Password</Label>
              <Input id='restore-password' type='password' value={restorePassword} onChange={(e) => setRestorePassword(e.target.value)} disabled={loading} />
            </div>
            {hasTwoFactor && (
              <div>
                <Label htmlFor='restore-totp'>Two-Factor Code</Label>
                <Input id='restore-totp' type='text' maxLength={6} value={restoreTotpCode} onChange={(e) => setRestoreTotpCode(e.target.value.replace(/[^0-9]/g, ''))} disabled={loading} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant='secondary' onClick={() => { setModal(''); setRestorePassword(''); setRestoreTotpCode(''); }} disabled={loading}>Cancel</Button>
            <Button variant='destructive' onClick={doRestorationAction} disabled={countdown > 0 || loading}>
              {loading ? 'Restoring...' : countdown > 0 ? `Delete All & Restore (${countdown}s)` : 'Delete All & Restore Backup'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={modal === 'delete'} onOpenChange={(open) => { if (!open) { setModal(''); setDeletePassword(''); setDeleteTotpCode(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete &quot;{backup.name}&quot;</DialogTitle></DialogHeader>
          <div className='space-y-4'>
            <p className='text-sm text-zinc-300'>This is a permanent operation. The backup cannot be recovered once deleted.</p>
            <div>
              <Label htmlFor='delete-password'>Password</Label>
              <Input id='delete-password' type='password' value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} disabled={loading} />
            </div>
            {hasTwoFactor && (
              <div>
                <Label htmlFor='delete-totp'>Two-Factor Code</Label>
                <Input id='delete-totp' type='text' maxLength={6} value={deleteTotpCode} onChange={(e) => setDeleteTotpCode(e.target.value.replace(/[^0-9]/g, ''))} disabled={loading} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant='secondary' onClick={() => { setModal(''); setDeletePassword(''); setDeleteTotpCode(''); }} disabled={loading}>Cancel</Button>
            <Button variant='destructive' onClick={doDeletion} disabled={loading}>{loading ? 'Deleting...' : 'Delete Backup'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {backup.isSuccessful ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='secondary' size='sm' disabled={loading} className='flex items-center justify-center w-8 h-8 p-0'>
              <svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <line x1='4' x2='20' y1='12' y2='12'/><line x1='4' x2='20' y1='6' y2='6'/><line x1='4' x2='20' y1='18' y2='18'/>
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-48'>
            {canDownload && <DropdownMenuItem onClick={doDownload}>Download</DropdownMenuItem>}
            {canRestore && <DropdownMenuItem onClick={() => setModal('restore')}>Restore</DropdownMenuItem>}
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setModal('rename')}>Rename</DropdownMenuItem>
                <DropdownMenuItem onClick={onLockToggle}>{backup.isLocked ? 'Unlock' : 'Lock'}</DropdownMenuItem>
                {!backup.isLocked && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setModal('delete')} className='text-red-400 focus:text-red-300'>Delete</DropdownMenuItem>
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button variant='destructive' size='sm' onClick={() => setModal('delete')} disabled={loading} className='flex items-center gap-2'>
          <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M3 6h18'/><path d='M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6'/><path d='M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'/>
          </svg>
          <span className='hidden sm:inline'>Delete</span>
        </Button>
      )}
    </>
  );
};

export default BackupContextMenu;
