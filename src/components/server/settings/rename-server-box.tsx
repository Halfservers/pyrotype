import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { useServerStore } from '@/store/server';
import { renameServerSchema, type RenameServerData } from '@/lib/validators';
import { useRenameServerMutation } from '@/lib/queries';
import { useFlashKey } from '@/lib/hooks';

const RenameServerBox = () => {
  const server = useServerStore((state) => state.server!);
  const { clearFlashes, clearAndAddHttpError } = useFlashKey('settings');
  const renameMutation = useRenameServerMutation(server.id);

  const form = useForm<RenameServerData>({
    resolver: zodResolver(renameServerSchema),
    defaultValues: {
      name: server.name,
      description: server.description || '',
    },
  });

  const onSubmit = (values: RenameServerData) => {
    clearFlashes();
    toast('Updating server details...');

    renameMutation.mutate(
      { name: values.name, description: values.description ?? undefined },
      {
        onSuccess: () => toast.success('Server details updated!'),
        onError: (error) => clearAndAddHttpError(error),
      },
    );
  };

  return (
    <div className='bg-[#ffffff09] border border-[#ffffff11] rounded-2xl p-6'>
      <h3 className='text-lg font-semibold text-neutral-200 mb-4'>Server Details</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-4'>
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Server Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='description'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Server Description</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className='mt-6 text-right'>
            <Button type='submit' disabled={renameMutation.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default RenameServerBox;
