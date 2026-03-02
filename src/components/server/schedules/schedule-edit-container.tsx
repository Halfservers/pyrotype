import { format } from 'date-fns';
import { useCallback, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import Can from '@/components/elements/can';
import Spinner from '@/components/elements/spinner';
import DeleteScheduleButton from '@/components/server/schedules/delete-schedule-button';
import EditScheduleModal from '@/components/server/schedules/edit-schedule-modal';
import ScheduleTaskRow from '@/components/server/schedules/schedule-task-row';
import TaskDetailsModal from '@/components/server/schedules/task-details-modal';

import { useServerStore } from '@/store/server';
import { useTriggerScheduleMutation, useServerSchedulesQuery } from '@/lib/queries';
import { useFlashKey } from '@/lib/hooks';

const ScheduleEditContainer = () => {
  const routeParams = useParams({ strict: false }) as { id: string; scheduleId?: string };
  const scheduleId = routeParams.scheduleId;
  const navigate = useNavigate();

  const serverId = useServerStore((state) => state.server!.id);
  const { clearFlashes, clearAndAddHttpError } = useFlashKey('schedules');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const { data: schedules, isLoading } = useServerSchedulesQuery(serverId);
  const schedule = schedules?.find((s) => s.id === Number(scheduleId));
  const triggerMutation = useTriggerScheduleMutation(serverId);

  const toggleEditModal = useCallback(() => setShowEditModal((s) => !s), []);

  const onTriggerExecute = useCallback(() => {
    clearFlashes();
    if (!schedule) return;
    triggerMutation.mutate(schedule.id, {
      onError: (error) => clearAndAddHttpError(error),
    });
  }, [schedule, triggerMutation]);

  return (
    <div className='space-y-6'>
      {!schedule || isLoading ? (
        <Spinner size='large' centered />
      ) : (
        <>
          <div className='bg-[#ffffff09] border border-[#ffffff11] flex items-center justify-between flex-col md:flex-row gap-6 p-6 rounded-2xl overflow-hidden'>
            <div className='flex-none self-start'>
              <h3 className='flex items-center text-neutral-100 text-2xl'>
                {schedule.name}
                <span className='flex items-center rounded-full px-2 py-px text-xs ml-4 uppercase bg-neutral-600 text-white'>
                  {schedule.isProcessing ? 'Processing' : schedule.isActive ? 'Active' : 'Inactive'}
                </span>
              </h3>
              <p className='mt-1 text-sm'>
                <strong>Last run at:&nbsp;</strong>
                {schedule.lastRunAt ? format(schedule.lastRunAt, "MMM do 'at' h:mma") : 'N/A'}
                <span className='ml-4 pl-4 border-l-4 border-neutral-600 py-px hidden sm:inline' />
                <br className='sm:hidden' />
                <strong>Next run at:&nbsp;</strong>
                {schedule.nextRunAt ? format(schedule.nextRunAt, "MMM do 'at' h:mma") : 'N/A'}
              </p>
            </div>
            <div className='flex gap-2 flex-col md:flex-row md:min-w-0 min-w-full'>
              <Can action='schedule.update'>
                <Button variant='outline' onClick={toggleEditModal} className='flex-1 min-w-max'>
                  Edit
                </Button>
                <Button onClick={() => setShowTaskModal(true)} className='flex-1 min-w-max'>
                  New Task
                </Button>
              </Can>
            </div>
          </div>

          <div className='grid grid-cols-3 sm:grid-cols-5 gap-4'>
            {[
              { title: 'Minute', value: schedule.cron.minute },
              { title: 'Hour', value: schedule.cron.hour },
              { title: 'Day (Month)', value: schedule.cron.dayOfMonth },
              { title: 'Month', value: schedule.cron.month },
              { title: 'Day (Week)', value: schedule.cron.dayOfWeek },
            ].map((item) => (
              <div key={item.title} className='bg-[#ffffff06] border border-[#ffffff10] rounded-lg p-3 text-center'>
                <p className='text-sm text-zinc-400'>{item.title}</p>
                <p className='font-mono font-medium'>{item.value}</p>
              </div>
            ))}
          </div>

          {schedule.tasks.length > 0 && (
            <div className='space-y-2'>
              {schedule.tasks
                .sort((a, b) => a.sequenceId - b.sequenceId)
                .map((task) => (
                  <ScheduleTaskRow key={`${schedule.id}_${task.id}`} task={task} schedule={schedule} />
                ))}
            </div>
          )}

          <EditScheduleModal visible={showEditModal} schedule={schedule} onModalDismissed={toggleEditModal} />

          <div className='gap-3 flex sm:justify-end'>
            <Can action='schedule.delete'>
              <DeleteScheduleButton
                scheduleId={schedule.id}
                onDeleted={() => navigate({ to: '/server/$id/schedules', params: { id: serverId } } as any)}
              />
            </Can>
            {schedule.tasks.length > 0 && (
              <Can action='schedule.update'>
                <Button
                  variant='outline'
                  className='flex-1 sm:flex-none'
                  disabled={schedule.isProcessing || triggerMutation.isPending}
                  onClick={onTriggerExecute}
                >
                  Run Now
                </Button>
              </Can>
            )}
          </div>

          <TaskDetailsModal
            schedule={schedule}
            visible={showTaskModal}
            onModalDismissed={() => setShowTaskModal(false)}
          />
        </>
      )}
    </div>
  );
};

export default ScheduleEditContainer;
