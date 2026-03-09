import { useForm } from '@tanstack/react-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { useServerStore } from '@/store/server';
import type { Schedule } from '@/store/server';
import { useCreateScheduleMutation } from '@/lib/queries';
import { useFlashKey } from '@/lib/hooks';

interface Props {
  schedule?: Schedule;
  visible: boolean;
  onModalDismissed: () => void;
}

const EditScheduleModal = ({ schedule, visible, onModalDismissed }: Props) => {
  const serverId = useServerStore((state) => state.server!.id);
  const { clearFlashes, clearAndAddHttpError } = useFlashKey('schedule:edit');
  const createMutation = useCreateScheduleMutation(serverId);

  const form = useForm({
    defaultValues: {
      name: schedule?.name || '',
      minute: schedule?.cron.minute || '*/5',
      hour: schedule?.cron.hour || '*',
      dayOfMonth: schedule?.cron.dayOfMonth || '*',
      month: schedule?.cron.month || '*',
      dayOfWeek: schedule?.cron.dayOfWeek || '*',
      enabled: schedule?.isActive ?? true,
      onlyWhenOnline: schedule?.onlyWhenOnline ?? true,
    },
    onSubmit: ({ value }) => {
      clearFlashes();
      createMutation.mutate(
        {
          id: schedule?.id,
          name: value.name,
          cron: {
            minute: value.minute,
            hour: value.hour,
            dayOfWeek: value.dayOfWeek,
            month: value.month,
            dayOfMonth: value.dayOfMonth,
          },
          onlyWhenOnline: value.onlyWhenOnline,
          isActive: value.enabled,
        },
        {
          onSuccess: () => {
            onModalDismissed();
            form.reset();
          },
          onError: (error) => clearAndAddHttpError(error),
        },
      );
    },
  });

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onModalDismissed()}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{schedule ? 'Edit schedule' : 'Create new schedule'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className='space-y-6'>
          <form.Field
            name='name'
            children={(field) => (
              <div className='space-y-2'>
                <Label>Schedule name</Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder='A human readable identifier'
                />
                {field.state.meta.errors.length > 0 && (
                  <p className='text-sm text-destructive'>{field.state.meta.errors.map(String).join(', ')}</p>
                )}
              </div>
            )}
          />

          <div className='grid grid-cols-2 sm:grid-cols-5 gap-4'>
            {(['minute', 'hour', 'dayOfWeek', 'dayOfMonth', 'month'] as const).map((name) => (
              <form.Field
                key={name}
                name={name}
                children={(field) => (
                  <div className='space-y-2'>
                    <Label className='capitalize'>{name === 'dayOfWeek' ? 'Day of week' : name === 'dayOfMonth' ? 'Day of month' : name}</Label>
                    <Input
                      value={field.state.value as string}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className='text-sm text-destructive'>{field.state.meta.errors.map(String).join(', ')}</p>
                    )}
                  </div>
                )}
              />
            ))}
          </div>

          <p className='text-zinc-400 text-xs'>
            The schedule system uses Cronjob syntax when defining when tasks should begin running.
          </p>

          <div className='space-y-3'>
            <a href='https://crontab.guru/' target='_blank' rel='noreferrer' className='text-sm text-brand hover:underline'>
              Crontab Guru - Online cron expression editor
            </a>

            <form.Field
              name='onlyWhenOnline'
              children={(field) => (
                <div className='flex flex-row items-center justify-between rounded-lg border p-3'>
                  <div className='space-y-0.5'>
                    <Label>Only When Server Is Online</Label>
                    <p className='text-sm text-muted-foreground'>Only execute this schedule when the server is running.</p>
                  </div>
                  <Switch checked={field.state.value} onCheckedChange={(checked) => field.handleChange(checked)} />
                </div>
              )}
            />

            <form.Field
              name='enabled'
              children={(field) => (
                <div className='flex flex-row items-center justify-between rounded-lg border p-3'>
                  <div className='space-y-0.5'>
                    <Label>Schedule Enabled</Label>
                    <p className='text-sm text-muted-foreground'>This schedule will be executed automatically if enabled.</p>
                  </div>
                  <Switch checked={field.state.value} onCheckedChange={(checked) => field.handleChange(checked)} />
                </div>
              )}
            />
          </div>

          <div className='text-right'>
            <Button type='submit' disabled={createMutation.isPending}>
              {schedule ? 'Save changes' : 'Create schedule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditScheduleModal;
