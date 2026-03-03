import { useForm } from '@tanstack/react-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useServerStore } from '@/store/server';
import { useRenameServerMutation } from '@/lib/queries';
import { useFlashKey } from '@/lib/hooks';

const RenameServerBox = () => {
  const server = useServerStore((state) => state.server!);
  const { clearFlashes, clearAndAddHttpError } = useFlashKey('settings');
  const renameMutation = useRenameServerMutation(server.id);

  const form = useForm({
    defaultValues: {
      name: server.name,
      description: server.description || '',
    },
    onSubmit: ({ value }) => {
      clearFlashes();
      toast('Updating server details...');

      renameMutation.mutate(
        { name: value.name, description: value.description ?? undefined },
        {
          onSuccess: () => toast.success('Server details updated!'),
          onError: (error) => clearAndAddHttpError(error),
        },
      );
    },
  });

  return (
    <div className='bg-[#ffffff09] border border-[#ffffff11] rounded-2xl p-6'>
      <h3 className='text-lg font-semibold text-neutral-200 mb-4'>Server Details</h3>
      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className='flex flex-col gap-4'>
        <form.Field
          name='name'
          children={(field) => (
            <div className='space-y-2'>
              <Label>Server Name</Label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {field.state.meta.errors.length > 0 && (
                <p className='text-sm text-destructive'>{field.state.meta.errors.map(String).join(', ')}</p>
              )}
            </div>
          )}
        />
        <form.Field
          name='description'
          children={(field) => (
            <div className='space-y-2'>
              <Label>Server Description</Label>
              <Input
                value={field.state.value ?? ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {field.state.meta.errors.length > 0 && (
                <p className='text-sm text-destructive'>{field.state.meta.errors.map(String).join(', ')}</p>
              )}
            </div>
          )}
        />
        <div className='mt-6 text-right'>
          <Button type='submit' disabled={renameMutation.isPending}>
            Save
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RenameServerBox;
