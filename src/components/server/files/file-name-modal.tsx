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
import { useServerStore } from '@/store/server';

interface Props {
  onClose: () => void;
  onFileNamed?: (name: string) => void;
  isRename?: boolean;
  useMoveTerminology?: boolean;
  files?: string[];
}

interface FormValues {
  fileName: string;
}

const FileNameModal = ({ onClose, onFileNamed, isRename, useMoveTerminology }: Props) => {
  const directory = useServerStore((state) => state.fileDirectory);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: { fileName: '' },
  });

  const onSubmit = (values: FormValues) => {
    setSubmitting(true);
    const fullPath = `${directory}/${values.fileName}`.replace(/\/+/g, '/');
    if (onFileNamed) {
      onFileNamed(fullPath);
    }
    setSubmitting(false);
    onClose();
  };

  const title = isRename
    ? useMoveTerminology
      ? 'Move file'
      : 'Rename file'
    : 'New file';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-4'>
          <div>
            <Label htmlFor='fileName'>File Name</Label>
            <Input
              id='fileName'
              {...register('fileName', { required: true, minLength: 1 })}
              autoFocus
            />
            {errors.fileName && (
              <p className='text-xs text-red-400 mt-1'>A file name is required.</p>
            )}
            <p className='text-xs text-zinc-400 mt-1'>
              Enter the name that this file should be saved as.
            </p>
          </div>
          <div className='flex justify-end'>
            <Button type='submit' disabled={submitting}>
              {isRename ? (useMoveTerminology ? 'Move' : 'Rename') : 'Create File'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FileNameModal;
