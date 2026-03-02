import { useState } from 'react';
import { Link } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import Can from '@/components/elements/can';
import ScheduleRow from '@/components/server/schedules/schedule-row';
import EditScheduleModal from '@/components/server/schedules/edit-schedule-modal';

import { useServerStore } from '@/store/server';
import { useServerSchedulesQuery } from '@/lib/queries';
import { useFlashKey } from '@/lib/hooks';

function ScheduleContainer() {
  const serverId = useServerStore((state) => state.server!.id);
  const { clearAndAddHttpError: _clearAndAddHttpError } = useFlashKey('schedules');
  const [visible, setVisible] = useState(false);

  const { data: schedules, isLoading } = useServerSchedulesQuery(serverId);

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-extrabold tracking-tight'>Schedules</h2>
          <p className='text-sm text-neutral-400 leading-relaxed mt-1'>
            Automate server tasks with scheduled commands. Create recurring tasks to manage your server, run backups,
            or execute custom commands.
          </p>
        </div>
        <Can action='schedule.create'>
          <Button onClick={() => setVisible(true)}>New Schedule</Button>
        </Can>
      </div>

      <Can action='schedule.create'>
        <EditScheduleModal visible={visible} onModalDismissed={() => setVisible(false)} />
      </Can>

      {isLoading ? null : !schedules?.length ? (
        <div className='flex flex-col items-center justify-center min-h-[60vh] py-12 px-4'>
          <div className='text-center'>
            <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-[#ffffff11] flex items-center justify-center'>
              <svg className='w-8 h-8 text-zinc-400' fill='currentColor' viewBox='0 0 20 20'>
                <path
                  fillRule='evenodd'
                  d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z'
                  clipRule='evenodd'
                />
              </svg>
            </div>
            <h3 className='text-lg font-medium text-zinc-200 mb-2'>No schedules found</h3>
            <p className='text-sm text-zinc-400 max-w-sm'>
              Your server does not have any scheduled tasks. Create one to automate server management.
            </p>
          </div>
        </div>
      ) : (
        <div className='space-y-2'>
          {schedules.map((schedule) => (
            <Link key={schedule.id} to={`./${schedule.id}` as any}>
              <div className='bg-[#ffffff06] border border-[#ffffff10] rounded-lg p-4 hover:border-[#ffffff15] transition-colors flex items-center gap-4'>
                <ScheduleRow schedule={schedule} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default ScheduleContainer;
