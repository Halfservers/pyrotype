import axios from 'axios';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useFlashKey } from '@/lib/hooks';
import { useServerStore } from '@/store/server';

import { getFileUploadUrl } from '@/lib/api/server/files';

function isFileOrDirectory(event: DragEvent): boolean {
  if (!event.dataTransfer?.types) return false;
  return event.dataTransfer.types.some((value) => value.toLowerCase() === 'files');
}

const UploadButton = () => {
  const fileUploadInput = useRef<HTMLInputElement>(null);
  const [timeouts] = useState<ReturnType<typeof setTimeout>[]>([]);
  const [visible, setVisible] = useState(false);
  const { addError, clearAndAddHttpError } = useFlashKey('files');

  const name = useServerStore((state) => state.server?.name ?? '');
  const uuid = useServerStore((state) => state.server?.uuid ?? '');
  const directory = useServerStore((state) => state.fileDirectory);

  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isFileOrDirectory(e)) setVisible(true);
    };
    const onDragExit = () => setVisible(false);
    const onKeyDown = () => { if (visible) setVisible(false); };

    document.addEventListener('dragenter', onDragEnter, { capture: true });
    document.addEventListener('dragexit', onDragExit, { capture: true });
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('dragenter', onDragEnter, { capture: true });
      document.removeEventListener('dragexit', onDragExit, { capture: true });
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [visible]);

  useEffect(() => {
    return () => timeouts.forEach(clearTimeout);
  }, []);

  const onFileSubmission = (files: FileList) => {
    clearAndAddHttpError();
    const list = Array.from(files);
    if (list.some((file) => !file.size || (!file.type && file.size === 4096))) {
      return addError('Folder uploads are not supported at this time.', 'Error');
    }

    const uploads = list.map((file) => {
      const controller = new AbortController();
      return () =>
        getFileUploadUrl(uuid).then((url: string) =>
          axios.post(
            url,
            { files: file },
            {
              signal: controller.signal,
              headers: { 'Content-Type': 'multipart/form-data' },
              params: { directory },
            },
          ),
        );
    });

    Promise.all(uploads.map((fn) => fn())).catch((error) => {
      clearAndAddHttpError(error);
    });
  };

  return (
    <>
      {visible && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/60'
          onClick={() => setVisible(false)}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setVisible(false)}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setVisible(false);
            if (!e.dataTransfer?.files.length) return;
            onFileSubmission(e.dataTransfer.files);
          }}
        >
          <div className='w-full flex items-center justify-center pointer-events-none'>
            <div className='relative flex flex-col items-center gap-4 bg-brand w-full rounded-2xl py-12 px-4 mx-10 max-w-sm'>
              <div className='absolute inset-4 border-dashed border-[#ffffff88] border-2 rounded-xl' />
              <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' className='w-8 h-8'>
                <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' stroke='white' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
                <polyline points='17 8 12 3 7 8' stroke='white' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
                <line x1='12' x2='12' y1='3' y2='15' stroke='white' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
              <h1 className='flex-1 text-lg font-bold tracking-tight text-center truncate w-full relative px-4'>
                Upload to {name}
              </h1>
            </div>
          </div>
        </div>
      )}
      <input
        type='file'
        ref={fileUploadInput}
        className='hidden'
        onChange={(e) => {
          if (!e.currentTarget.files) return;
          onFileSubmission(e.currentTarget.files);
          if (fileUploadInput.current) fileUploadInput.current.files = null;
        }}
        multiple
      />
      <Button
        variant='secondary'
        onClick={() => fileUploadInput.current?.click()}
      >
        Upload
      </Button>
    </>
  );
};

export default UploadButton;
