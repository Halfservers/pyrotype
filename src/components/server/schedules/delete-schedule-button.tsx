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
import { useDeleteScheduleMutation } from '@/lib/queries';
import { useFlashKey } from '@/lib/hooks';

interface Props {
  scheduleId: number;
  onDeleted: () => void;
}

const DeleteScheduleButton = ({ scheduleId, onDeleted }: Props) => {
  const [visible, setVisible] = useState(false);
  const serverId = useServerStore((state) => state.server!.id);
  const { clearFlashes, clearAndAddHttpError } = useFlashKey('schedules');

  const deleteMutation = useDeleteScheduleMutation(serverId);

  const onDelete = () => {
    clearFlashes();
    deleteMutation.mutate(scheduleId, {
      onSuccess: () => {
        setVisible(false);
        onDeleted();
      },
      onError: (error) => {
        clearAndAddHttpError(error);
        setVisible(false);
      },
    });
  };

  return (
    <>
      <AlertDialog open={visible} onOpenChange={setVisible}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              All tasks will be removed and any running processes will be terminated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={deleteMutation.isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button variant='destructive' className='flex-1 sm:flex-none' onClick={() => setVisible(true)}>
        Delete
      </Button>
    </>
  );
};

export default DeleteScheduleButton;
