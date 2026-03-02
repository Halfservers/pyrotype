import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';

import { useServerStore } from '@/store/server';
import type { Schedule } from '@/store/server';
import { createScheduleSchema, type CreateScheduleData } from '@/lib/validators';
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

  const form = useForm<CreateScheduleData>({
    resolver: zodResolver(createScheduleSchema),
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
  });

  const onSubmit = (values: CreateScheduleData) => {
    clearFlashes();
    createMutation.mutate(
      {
        id: schedule?.id,
        name: values.name,
        cron: {
          minute: values.minute,
          hour: values.hour,
          dayOfWeek: values.dayOfWeek,
          month: values.month,
          dayOfMonth: values.dayOfMonth,
        },
        onlyWhenOnline: values.onlyWhenOnline,
        isActive: values.enabled,
      },
      {
        onSuccess: () => {
          onModalDismissed();
          form.reset();
        },
        onError: (error) => clearAndAddHttpError(error),
      },
    );
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onModalDismissed()}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{schedule ? 'Edit schedule' : 'Create new schedule'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder='A human readable identifier' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 sm:grid-cols-5 gap-4'>
              {(['minute', 'hour', 'dayOfWeek', 'dayOfMonth', 'month'] as const).map((name) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='capitalize'>{name === 'dayOfWeek' ? 'Day of week' : name === 'dayOfMonth' ? 'Day of month' : name}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
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

              <FormField
                control={form.control}
                name='onlyWhenOnline'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3'>
                    <div className='space-y-0.5'>
                      <FormLabel>Only When Server Is Online</FormLabel>
                      <FormDescription>Only execute this schedule when the server is running.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='enabled'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3'>
                    <div className='space-y-0.5'>
                      <FormLabel>Schedule Enabled</FormLabel>
                      <FormDescription>This schedule will be executed automatically if enabled.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className='text-right'>
              <Button type='submit' disabled={createMutation.isPending}>
                {schedule ? 'Save changes' : 'Create schedule'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditScheduleModal;
