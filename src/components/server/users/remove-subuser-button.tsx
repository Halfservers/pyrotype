import { Trash2 } from 'lucide-react';
import { useState } from 'react';

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
import type { Subuser } from '@/store/server';
import { useDeleteSubuserMutation } from '@/lib/queries';
import { useFlashKey } from '@/lib/hooks';

const RemoveSubuserButton = ({ subuser }: { subuser: Subuser }) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const serverId = useServerStore((state) => state.server!.id);
  const { clearFlashes, clearAndAddHttpError } = useFlashKey('users');

  const deleteMutation = useDeleteSubuserMutation(serverId);

  const doDeletion = () => {
    clearFlashes();
    deleteMutation.mutate(subuser.uuid, {
      onSuccess: () => setShowConfirmation(false),
      onError: (error) => {
        clearAndAddHttpError(error);
        setShowConfirmation(false);
      },
    });
  };

  return (
    <>
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {subuser.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              All access to the server will be removed immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDeletion} disabled={deleteMutation.isPending}>
              Remove {subuser.username}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button variant='destructive' size='sm' onClick={() => setShowConfirmation(true)} className='flex items-center gap-2'>
        <Trash2 className='w-4 h-4' />
        Delete
      </Button>
    </>
  );
};

export default RemoveSubuserButton;
