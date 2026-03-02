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
import { Button } from '@/components/ui/button';
import FileNameModal from '@/components/server/files/file-name-modal';
import { useFlash } from '@/lib/hooks';
import { useServerStore } from '@/store/server';

import { compressFiles, deleteFiles } from '@/lib/api/server/files';

const MassActionsBar = () => {
  const uuid = useServerStore((state) => state.server?.uuid ?? '');
  const directory = useServerStore((state) => state.fileDirectory);
  const selectedFiles = useServerStore((state) => state.selectedFiles);
  const setSelectedFiles = useServerStore((state) => state.setSelectedFiles);
  const { clearFlashes, clearAndAddHttpError } = useFlash();

  const [loading, setLoading] = useState(false);
  const [_loadingMessage, setLoadingMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showMove, setShowMove] = useState(false);

  useEffect(() => {
    if (!loading) setLoadingMessage('');
  }, [loading]);

  const onClickCompress = () => {
    setLoading(true);
    clearFlashes('files');
    setLoadingMessage('Archiving files...');

    compressFiles(uuid, directory, selectedFiles)
      .then(() => setSelectedFiles([]))
      .catch((error: unknown) => clearAndAddHttpError({ key: 'files', error }))
      .then(() => setLoading(false));
  };

  const onClickConfirmDeletion = () => {
    setLoading(true);
    setShowConfirm(false);
    clearFlashes('files');
    setLoadingMessage('Deleting files...');

    deleteFiles(uuid, directory, selectedFiles)
      .then(() => setSelectedFiles([]))
      .catch((error: unknown) => clearAndAddHttpError({ key: 'files', error }))
      .then(() => setLoading(false));
  };

  if (selectedFiles.length === 0) return null;

  return (
    <>
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Files</AlertDialogTitle>
            <AlertDialogDescription>
              <p className='mb-2'>
                Are you sure you want to delete{' '}
                <span className='font-semibold text-zinc-50'>{selectedFiles.length} files</span>? This is a
                permanent action and the files cannot be recovered.
              </p>
              <ul className='list-disc list-inside'>
                {selectedFiles.slice(0, 15).map((file) => (
                  <li key={file}>{file}</li>
                ))}
                {selectedFiles.length > 15 && <li>and {selectedFiles.length - 15} others</li>}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onClickConfirmDeletion}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showMove && (
        <FileNameModal
          isRename
          useMoveTerminology
          files={selectedFiles}
          onClose={() => setShowMove(false)}
        />
      )}

      <div className='fixed bottom-0 left-0 right-0 mb-6 flex justify-center w-full z-50'>
        <div className='flex items-center space-x-4 pointer-events-auto rounded-sm p-4 bg-black/50 backdrop-blur-sm'>
          <Button variant='secondary' onClick={() => setShowMove(true)} disabled={loading}>
            Move
          </Button>
          <Button variant='secondary' onClick={onClickCompress} disabled={loading}>
            Archive
          </Button>
          <Button variant='destructive' onClick={() => setShowConfirm(true)} disabled={loading}>
            Delete
          </Button>
        </div>
      </div>
    </>
  );
};

export default MassActionsBar;
