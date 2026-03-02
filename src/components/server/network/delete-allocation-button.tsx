import { useState } from 'react';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
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

import { useServerStore } from '@/store/server';
import { useDeleteAllocationMutation } from '@/lib/queries';
import { useFlashKey } from '@/lib/hooks';

interface Props {
  allocation: number;
}

const DeleteAllocationButton = ({ allocation }: Props) => {
  const [confirm, setConfirm] = useState(false);

  const serverId = useServerStore((state) => state.server!.id);
  const { clearFlashes, clearAndAddHttpError } = useFlashKey('server:network');

  const deleteMutation = useDeleteAllocationMutation(serverId);

  const deleteAllocation = () => {
    clearFlashes();
    setConfirm(false);
    deleteMutation.mutate(allocation, {
      onError: (error) => clearAndAddHttpError(error),
    });
  };

  return (
    <>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Allocation</AlertDialogTitle>
            <AlertDialogDescription>
              This allocation will be immediately removed from your server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAllocation}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button variant='destructive' size='sm' onClick={() => setConfirm(true)} className='flex items-center gap-2'>
        <Trash2 className='w-4 h-4' />
        <span className='hidden sm:inline'>Delete</span>
      </Button>
    </>
  );
};

export default DeleteAllocationButton;
