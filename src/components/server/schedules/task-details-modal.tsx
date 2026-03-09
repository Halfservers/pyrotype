import { useForm } from '@tanstack/react-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { useServerStore } from '@/store/server';
import type { Schedule, ScheduleTask } from '@/store/server';
import { useCreateScheduleTaskMutation } from '@/lib/queries';
import { useFlashKey } from '@/lib/hooks';

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

  const form = useForm({
    defaultValues: {
      action: task?.action || 'command',
      payload: task?.payload || '',
      timeOffset: task?.timeOffset ?? 0,
      continueOnFailure: task?.continueOnFailure ?? false,
    },
    onSubmit: ({ value }) => {
      clearFlashes();

      if (backupLimit === 0 && value.action === 'backup') {
        addError("A backup task cannot be created when the server's backup limit is set to 0.");
        return;
      }

      createTaskMutation.mutate(
        {
          scheduleId: schedule.id,
          taskId: task?.id,
          data: {
            action: value.action,
            payload: value.payload,
            timeOffset: value.timeOffset,
            continueOnFailure: value.continueOnFailure,
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
    },
  });

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onModalDismissed()}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Create Task'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className='space-y-4'>
          <form.Field
            name='action'
            children={(field) => (
              <div className='space-y-2'>
                <Label>Action</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    field.handleChange(value);
                    if (value === 'power') form.setFieldValue('payload', 'start');
                    else form.setFieldValue('payload', '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='command'>Send command</SelectItem>
                    <SelectItem value='power'>Power</SelectItem>
                    <SelectItem value='backup'>Create backup</SelectItem>
                  </SelectContent>
                </Select>
                {field.state.meta.errors.length > 0 && (
                  <p className='text-sm text-destructive'>{field.state.meta.errors.map(String).join(', ')}</p>
                )}
              </div>
            )}
          />

          <form.Field
            name='timeOffset'
            children={(field) => (
              <div className='space-y-2'>
                <Label>Time offset (in seconds)</Label>
                <Input
                  type='number'
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  onBlur={field.handleBlur}
                />
                <p className='text-sm text-muted-foreground'>
                  The amount of time to wait after the previous task executes before running this one.
                </p>
                {field.state.meta.errors.length > 0 && (
                  <p className='text-sm text-destructive'>{field.state.meta.errors.map(String).join(', ')}</p>
                )}
              </div>
            )}
          />

          <form.Subscribe
            selector={(s) => s.values.action}
            children={(actionValue) => (
              <>
                {actionValue === 'command' && (
                  <form.Field
                    name='payload'
                    children={(field) => (
                      <div className='space-y-2'>
                        <Label>Payload</Label>
                        <Textarea
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          rows={6}
                          placeholder='Enter the command to send...'
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className='text-sm text-destructive'>{field.state.meta.errors.map(String).join(', ')}</p>
                        )}
                      </div>
                    )}
                  />
                )}

                {actionValue === 'power' && (
                  <form.Field
                    name='payload'
                    children={(field) => (
                      <div className='space-y-2'>
                        <Label>Payload</Label>
                        <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='start'>Start the server</SelectItem>
                            <SelectItem value='restart'>Restart the server</SelectItem>
                            <SelectItem value='stop'>Stop the server</SelectItem>
                            <SelectItem value='kill'>Terminate the server</SelectItem>
                          </SelectContent>
                        </Select>
                        {field.state.meta.errors.length > 0 && (
                          <p className='text-sm text-destructive'>{field.state.meta.errors.map(String).join(', ')}</p>
                        )}
                      </div>
                    )}
                  />
                )}

                {actionValue === 'backup' && (
                  <form.Field
                    name='payload'
                    children={(field) => (
                      <div className='space-y-2'>
                        <Label>Ignored files (optional)</Label>
                        <Textarea
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          rows={6}
                          placeholder='Files and folders to exclude...'
                        />
                        <p className='text-sm text-muted-foreground'>
                          Include the files and folders to be excluded in this backup.
                        </p>
                        {field.state.meta.errors.length > 0 && (
                          <p className='text-sm text-destructive'>{field.state.meta.errors.map(String).join(', ')}</p>
                        )}
                      </div>
                    )}
                  />
                )}
              </>
            )}
          />

          <form.Field
            name='continueOnFailure'
            children={(field) => (
              <div className='flex flex-row items-center justify-between rounded-lg border p-3'>
                <div className='space-y-0.5'>
                  <Label>Continue on Failure</Label>
                  <p className='text-sm text-muted-foreground'>Future tasks will be run if this task fails.</p>
                </div>
                <Switch checked={field.state.value} onCheckedChange={(checked) => field.handleChange(checked)} />
              </div>
            )}
          />

          <div className='flex justify-end pt-4'>
            <Button type='submit' disabled={createTaskMutation.isPending}>
              {task ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailsModal;
