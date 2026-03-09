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

const ChmodFileModal = ({ files, onClose }: Props) => {
  const uuid = useServerStore((state) => state.server?.uuid ?? '');
  const directory = useServerStore((state) => state.fileDirectory);
  const setSelectedFiles = useServerStore((state) => state.setSelectedFiles);
  const { clearFlashes, clearAndAddHttpError } = useFlash();

  const form = useForm({
    defaultValues: { mode: files.length > 1 ? '' : (files[0]?.mode ?? '') },
    onSubmit: async ({ value }) => {
      clearFlashes('files');
      const data = files.map((f) => ({ file: f.file, mode: value.mode }));
      try {
        await chmodFiles(uuid, directory, data);
        setSelectedFiles([]);
        onClose();
      } catch (error) {
        clearAndAddHttpError({ key: 'files', error });
      }
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure permissions</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className='flex flex-col gap-4'>
          <form.Field
            name='mode'
            children={(field) => (
              <div>
                <Label htmlFor='file_mode'>File Mode</Label>
                <Input
                  id='file_mode'
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  autoFocus
                />
                <p className='text-xs text-zinc-400 mt-1'>
                  This is intended for advanced users. You may irreperably damage your server by changing file permissions.
                </p>
              </div>
            )}
          />
          <form.Subscribe
            selector={(s) => s.isSubmitting}
            children={(isSubmitting) => (
              <div className='flex justify-end'>
                <Button type='submit' disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update'}
                </Button>
              </div>
            )}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChmodFileModal;
