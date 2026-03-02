import { Terminal, Power, Cloud, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import Can from '@/components/elements/can';
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
import TaskDetailsModal from '@/components/server/schedules/task-details-modal';

import { useServerStore } from '@/store/server';
import type { Schedule, ScheduleTask } from '@/store/server';
import { useDeleteScheduleTaskMutation } from '@/lib/queries';
import { useFlashKey } from '@/lib/hooks';

interface Props {
  schedule: Schedule;
  task: ScheduleTask;
}

const getActionDetails = (action: string): [string, typeof Terminal] => {
  switch (action) {
    case 'command':
      return ['Send Command', Terminal];
    case 'power':
      return ['Send Power Action', Power];
    case 'backup':
      return ['Create Backup', Cloud];
    default:
      return ['Unknown Action', Terminal];
  }
};

const ScheduleTaskRow = ({ schedule, task }: Props) => {
  const serverId = useServerStore((state) => state.server!.id);
  const { clearFlashes, clearAndAddHttpError } = useFlashKey('schedules');
  const [showDelete, setShowDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const deleteTaskMutation = useDeleteScheduleTaskMutation(serverId);

  const onConfirmDeletion = () => {
    clearFlashes();
    deleteTaskMutation.mutate(
      { scheduleId: schedule.id, taskId: task.id },
      {
        onError: (error) => clearAndAddHttpError(error),
      },
    );
    setShowDelete(false);
  };

  const [title, Icon] = getActionDetails(task.action);

  return (
    <div className='bg-[#ffffff06] border border-[#ffffff10] rounded-lg p-4 flex items-center gap-4'>
      <Icon className='w-5 h-5 text-zinc-400 hidden md:block flex-shrink-0' />
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-medium text-zinc-200'>{title}</p>
        {task.payload && (
          <p className='text-xs text-zinc-400 truncate mt-1 font-mono'>
            {task.payload.length > 100 ? `${task.payload.substring(0, 100)}...` : task.payload}
          </p>
        )}
      </div>
      <div className='flex flex-none items-center gap-2'>
        {task.continueOnFailure && (
          <span className='px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full'>Continues on Failure</span>
        )}
        {task.sequenceId > 1 && task.timeOffset > 0 && (
          <span className='px-2 py-1 bg-zinc-500/20 text-zinc-300 text-xs rounded-full'>{task.timeOffset}s later</span>
        )}
        <Can action='schedule.update'>
          <Button variant='outline' size='sm' onClick={() => setIsEditing(true)}>
            <Pencil className='w-4 h-4 mr-1' />
            Edit
          </Button>
        </Can>
        <Can action='schedule.update'>
          <Button variant='destructive' size='sm' onClick={() => setShowDelete(true)}>
            <Trash2 className='w-4 h-4' />
            <span className='hidden sm:inline ml-1'>Delete</span>
          </Button>
        </Can>
      </div>

      <TaskDetailsModal
        schedule={schedule}
        task={task}
        visible={isEditing}
        onModalDismissed={() => setIsEditing(false)}
      />

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm task deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDeletion}>Delete Task</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ScheduleTaskRow;
