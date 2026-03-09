import { useForm } from '@tanstack/react-form';

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

const FileNameModal = ({ onClose, onFileNamed, isRename, useMoveTerminology }: Props) => {
  const directory = useServerStore((state) => state.fileDirectory);

  const form = useForm({
    defaultValues: { fileName: '' },
    onSubmit: ({ value }) => {
      const fullPath = `${directory}/${value.fileName}`.replace(/\/+/g, '/');
      if (onFileNamed) {
        onFileNamed(fullPath);
      }
      onClose();
    },
  });

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
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className='flex flex-col gap-4'>
          <form.Field
            name='fileName'
            children={(field) => (
              <div>
                <Label htmlFor='fileName'>File Name</Label>
                <Input
                  id='fileName'
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  autoFocus
                />
                {field.state.meta.isTouched && !field.state.value && (
                  <p className='text-xs text-red-400 mt-1'>A file name is required.</p>
                )}
                <p className='text-xs text-zinc-400 mt-1'>
                  Enter the name that this file should be saved as.
                </p>
              </div>
            )}
          />
          <form.Subscribe
            selector={(s) => s.isSubmitting}
            children={(isSubmitting) => (
              <div className='flex justify-end'>
                <Button type='submit' disabled={isSubmitting}>
                  {isRename ? (useMoveTerminology ? 'Move' : 'Rename') : 'Create File'}
                </Button>
              </div>
            )}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FileNameModal;
