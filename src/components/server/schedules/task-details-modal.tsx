import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';

import { useServerStore } from '@/store/server';
import type { Schedule, ScheduleTask } from '@/store/server';
import { z } from 'zod';
import { createScheduleTaskSchema, type CreateScheduleTaskData } from '@/lib/validators';
import { useCreateScheduleTaskMutation } from '@/lib/queries';
import { useFlashKey } from '@/lib/hooks';

const taskFormSchema = createScheduleTaskSchema.extend({
  continueOnFailure: z.boolean().default(false),
});

type TaskFormData = CreateScheduleTaskData & { continueOnFailure: boolean };

interface Props {
  schedule: Schedule;
  task?: ScheduleTask;
  visible: boolean;
  onModalDismissed: () => void;
}

const TaskDetailsModal = ({ schedule, task, visible, onModalDismissed }: Props) => {
  const serverId = useServerStore((state) => state.server!.id);
  const backupLimit = useServerStore((state) => state.server!.featureLimits.backups);
  const { clearFlashes, clearAndAddHttpError, addError } = useFlashKey('schedule:task');

  const createTaskMutation = useCreateScheduleTaskMutation(serverId);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema) as any,
    defaultValues: {
      action: task?.action || 'command',
      payload: task?.payload || '',
      timeOffset: task?.timeOffset ?? 0,
      continueOnFailure: task?.continueOnFailure ?? false,
    },
  });

  const actionValue = form.watch('action');

  const onSubmit = (values: TaskFormData) => {
    clearFlashes();

    if (backupLimit === 0 && values.action === 'backup') {
      addError("A backup task cannot be created when the server's backup limit is set to 0.");
      return;
    }

    createTaskMutation.mutate(
      {
        scheduleId: schedule.id,
        taskId: task?.id,
        data: {
          action: values.action,
          payload: values.payload,
          timeOffset: values.timeOffset,
          continueOnFailure: values.continueOnFailure,
        },
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
          <DialogTitle>{task ? 'Edit Task' : 'Create Task'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='action'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value === 'power') form.setValue('payload', 'start');
                      else form.setValue('payload', '');
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='command'>Send command</SelectItem>
                      <SelectItem value='power'>Power</SelectItem>
                      <SelectItem value='backup'>Create backup</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='timeOffset'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time offset (in seconds)</FormLabel>
                  <FormControl>
                    <Input type='number' {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormDescription>
                    The amount of time to wait after the previous task executes before running this one.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {actionValue === 'command' && (
              <FormField
                control={form.control}
                name='payload'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payload</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={6} placeholder='Enter the command to send...' />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {actionValue === 'power' && (
              <FormField
                control={form.control}
                name='payload'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payload</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='start'>Start the server</SelectItem>
                        <SelectItem value='restart'>Restart the server</SelectItem>
                        <SelectItem value='stop'>Stop the server</SelectItem>
                        <SelectItem value='kill'>Terminate the server</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {actionValue === 'backup' && (
              <FormField
                control={form.control}
                name='payload'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ignored files (optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={6} placeholder='Files and folders to exclude...' />
                    </FormControl>
                    <FormDescription>
                      Include the files and folders to be excluded in this backup.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name='continueOnFailure'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3'>
                  <div className='space-y-0.5'>
                    <FormLabel>Continue on Failure</FormLabel>
                    <FormDescription>Future tasks will be run if this task fails.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className='flex justify-end pt-4'>
              <Button type='submit' disabled={createTaskMutation.isPending}>
                {task ? 'Save Changes' : 'Create Task'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailsModal;
