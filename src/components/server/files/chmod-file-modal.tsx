import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useFlash } from '@/lib/hooks';
import { useServerStore } from '@/store/server';

import { chmodFiles } from '@/lib/api/server/files';

interface ChmodFile {
  file: string;
  mode: string;
}

interface Props {
  files: ChmodFile[];
  onClose: () => void;
}

interface FormValues {
  mode: string;
}

const ChmodFileModal = ({ files, onClose }: Props) => {
  const uuid = useServerStore((state) => state.server?.uuid ?? '');
  const directory = useServerStore((state) => state.fileDirectory);
  const setSelectedFiles = useServerStore((state) => state.setSelectedFiles);
  const { clearFlashes, clearAndAddHttpError } = useFlash();
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: { mode: files.length > 1 ? '' : (files[0]?.mode ?? '') },
  });

  const onSubmit = async (values: FormValues) => {
    clearFlashes('files');
    setSubmitting(true);

    const data = files.map((f) => ({ file: f.file, mode: values.mode }));

    try {
      await chmodFiles(uuid, directory, data);
      setSelectedFiles([]);
      onClose();
    } catch (error) {
      clearAndAddHttpError({ key: 'files', error });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure permissions</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-4'>
          <div>
            <Label htmlFor='file_mode'>File Mode</Label>
            <Input
              id='file_mode'
              {...register('mode')}
              autoFocus
            />
            <p className='text-xs text-zinc-400 mt-1'>
              This is intended for advanced users. You may irreperably damage your server by changing file permissions.
            </p>
          </div>
          <div className='flex justify-end'>
            <Button type='submit' disabled={submitting}>
              {submitting ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChmodFileModal;
