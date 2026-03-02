import { memo, useState } from 'react';
import isEqual from 'react-fast-compare';
import { toast } from 'sonner';

import {
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu';
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
import ChmodFileModal from '@/components/server/files/chmod-file-modal';
import FileNameModal from '@/components/server/files/file-name-modal';
import { usePermissions, useFlash } from '@/lib/hooks';
import { useServerStore } from '@/store/server';

import { compressFiles, copyFile, decompressFiles, deleteFiles, getFileDownloadUrl } from '@/lib/api/server/files';
import type { FileObject } from '@/lib/api/server/files';

type ModalType = 'rename' | 'move' | 'chmod';

const FileDropdownMenu = ({ file }: { file: FileObject }) => {
  const [modal, setModal] = useState<ModalType | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const uuid = useServerStore((state) => state.server?.uuid ?? '');
  const directory = useServerStore((state) => state.fileDirectory);
  const { clearAndAddHttpError, clearFlashes } = useFlash();

  const [canUpdate] = usePermissions(['file.update']);
  const [canCreate] = usePermissions(['file.create']);
  const [canArchive] = usePermissions(['file.archive']);
  const [canDelete] = usePermissions(['file.delete']);

  const doDeletion = async () => {
    clearFlashes('files');
    deleteFiles(uuid, directory, [file.name]).catch((error: unknown) => {
      clearAndAddHttpError({ key: 'files', error });
    });
    setShowConfirmation(false);
  };

  const doCopy = () => {
    clearFlashes('files');
    toast.info('Duplicating...');
    const path = `${directory}/${file.name}`.replace(/\/+/g, '/');
    copyFile(uuid, path)
      .then(() => toast.success('File successfully duplicated.'))
      .catch((error: unknown) => clearAndAddHttpError({ key: 'files', error }));
  };

  const doDownload = () => {
    clearFlashes('files');
    const path = `${directory}/${file.name}`.replace(/\/+/g, '/');
    getFileDownloadUrl(uuid, path)
      .then((url: string) => {
        window.location.href = url;
      })
      .catch((error: unknown) => clearAndAddHttpError({ key: 'files', error }));
  };

  const doArchive = () => {
    clearFlashes('files');
    toast.info('Archiving files...');
    compressFiles(uuid, directory, [file.name])
      .then(() => toast.success('Files successfully archived.'))
      .catch((error: unknown) => clearAndAddHttpError({ key: 'files', error }));
  };

  const doUnarchive = () => {
    clearFlashes('files');
    toast.info('Unarchiving files...');
    decompressFiles(uuid, directory, file.name)
      .then(() => toast.success('Files successfully unarchived.'))
      .catch((error: unknown) => clearAndAddHttpError({ key: 'files', error }));
  };

  return (
    <>
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {file.isFile ? 'File' : 'Directory'}</AlertDialogTitle>
            <AlertDialogDescription>
              You will not be able to recover the contents of
              <span className='font-semibold text-zinc-50'> {file.name}</span> once deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDeletion}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {modal === 'chmod' && (
        <ChmodFileModal
          files={[{ file: file.name, mode: file.modeBits }]}
          onClose={() => setModal(null)}
        />
      )}
      {(modal === 'rename' || modal === 'move') && (
        <FileNameModal
          isRename
          useMoveTerminology={modal === 'move'}
          files={[file.name]}
          onClose={() => setModal(null)}
        />
      )}

      <ContextMenuContent className='flex flex-col gap-1'>
        {canUpdate && (
          <>
            <ContextMenuItem className='flex gap-2' onSelect={() => setModal('rename')}>
              <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'/></svg>
              <span>Rename</span>
            </ContextMenuItem>
            <ContextMenuItem className='flex gap-2' onSelect={() => setModal('move')}>
              <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M5 12h14'/><path d='m12 5 7 7-7 7'/></svg>
              <span>Move</span>
            </ContextMenuItem>
            <ContextMenuItem className='flex gap-2' onSelect={() => setModal('chmod')}>
              <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10'/></svg>
              <span>Permissions</span>
            </ContextMenuItem>
          </>
        )}
        {file.isFile && canCreate && (
          <ContextMenuItem className='flex gap-2' onClick={doCopy}>
            <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect width='14' height='14' x='8' y='8' rx='2' ry='2'/><path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'/></svg>
            <span>Duplicate</span>
          </ContextMenuItem>
        )}
        {file.isArchiveType?.() ? (
          canCreate && (
            <ContextMenuItem className='flex gap-2' onSelect={doUnarchive}>
              <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='m21 8-2-2H5L3 8'/><rect width='18' height='12' x='3' y='8' rx='1'/><path d='M10 12h4'/></svg>
              <span>Unarchive</span>
            </ContextMenuItem>
          )
        ) : (
          canArchive && (
            <ContextMenuItem className='flex gap-2' onSelect={doArchive}>
              <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='m21 8-2-2H5L3 8'/><rect width='18' height='12' x='3' y='8' rx='1'/><path d='M10 12h4'/></svg>
              <span>Archive</span>
            </ContextMenuItem>
          )
        )}
        {file.isFile && (
          <ContextMenuItem className='flex gap-2' onSelect={doDownload}>
            <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' x2='12' y1='15' y2='3'/></svg>
            <span>Download</span>
          </ContextMenuItem>
        )}
        {canDelete && (
          <ContextMenuItem className='flex gap-2' onSelect={() => setShowConfirmation(true)}>
            <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M3 6h18'/><path d='M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6'/><path d='M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'/></svg>
            <span>Delete</span>
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </>
  );
};

export default memo(FileDropdownMenu, isEqual);
