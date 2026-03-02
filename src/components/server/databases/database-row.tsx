import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import RotatePasswordButton from '@/components/server/databases/rotate-password-button';
import { useFlash, usePermissions } from '@/lib/hooks';
import { useServerStore } from '@/store/server';

import { httpErrorToHuman } from '@/lib/api/http';
import { deleteServerDatabase, type ServerDatabase } from '@/lib/api/server/databases';

interface Props {
  database: ServerDatabase;
}

const CopyOnClick = ({ text, children }: { text: string | undefined; children: React.ReactNode }) => {
  const handleClick = () => {
    if (text) navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard!'));
  };
  return <div onClick={handleClick} className='cursor-pointer'>{children}</div>;
};

const DatabaseRow = ({ database }: Props) => {
  const uuid = useServerStore((state) => state.server?.uuid ?? '');
  const { addError, clearFlashes } = useFlash();
  const [visible, setVisible] = useState(false);
  const [connectionVisible, setConnectionVisible] = useState(false);

  const appendDatabase = useServerStore((state) => state.appendDatabase);
  const removeDatabase = useServerStore((state) => state.removeDatabase);

  const [canViewPassword] = usePermissions(['database.view_password']);
  const [canUpdate] = usePermissions(['database.update']);
  const [canDeleteDb] = usePermissions(['database.delete']);

  const jdbcConnectionString = `jdbc:mysql://${database.username}${database.password ? `:${encodeURIComponent(database.password)}` : ''}@${database.connectionString}/${database.name}`;

  const { register, handleSubmit, formState: { isSubmitting, isValid }, reset } = useForm({
    defaultValues: { confirm: '' },
    mode: 'onChange',
  });

  const submit = async (_values: { confirm: string }) => {
    clearFlashes();
    try {
      await deleteServerDatabase(uuid, database.id);
      reset();
      setVisible(false);
      setTimeout(() => removeDatabase(database.id), 150);
    } catch (error) {
      reset();
      console.error(error);
      addError({ key: 'database:delete', message: httpErrorToHuman(error) });
    }
  };

  const expectedName = database.name.split('_', 2)[1] || database.name;

  return (
    <>
      {/* Delete confirmation modal */}
      <Dialog open={visible} onOpenChange={(open) => { if (!open) { setVisible(false); reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm database deletion</DialogTitle>
          </DialogHeader>
          <div className='flex flex-col'>
            <p className='text-sm text-zinc-300'>
              Deleting a database is a permanent action, it cannot be undone. This will permanently
              delete the <strong>{database.name}</strong> database and remove all its data.
            </p>
            <form onSubmit={handleSubmit(submit)} className='mt-6 flex flex-col gap-4'>
              <div>
                <Label htmlFor='confirm_name'>Confirm Database Name</Label>
                <Input
                  id='confirm_name'
                  {...register('confirm', {
                    required: true,
                    validate: (v) => v === expectedName || v === database.name,
                  })}
                />
                <p className='text-xs text-zinc-400 mt-1'>Enter the database name to confirm deletion.</p>
              </div>
              <Button variant='destructive' type='submit' className='w-full' disabled={!isValid || isSubmitting}>
                {isSubmitting ? 'Deleting...' : 'Delete Database'}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Connection details modal */}
      <Dialog open={connectionVisible} onOpenChange={setConnectionVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Database connection details</DialogTitle>
          </DialogHeader>
          <div className='flex flex-col min-w-full gap-4'>
            <div className='grid gap-4 sm:grid-cols-2 min-w-full'>
              <div className='flex flex-col'>
                <Label className='mb-1'>Endpoint</Label>
                <CopyOnClick text={database.connectionString}>
                  <Input type='text' readOnly value={database.connectionString} />
                </CopyOnClick>
              </div>
              <div className='flex flex-col'>
                <Label className='mb-1'>Connections from</Label>
                <CopyOnClick text={database.allowConnectionsFrom}>
                  <Input type='text' readOnly value={database.allowConnectionsFrom} />
                </CopyOnClick>
              </div>
              <div className='flex flex-col'>
                <Label className='mb-1'>Username</Label>
                <CopyOnClick text={database.username}>
                  <Input type='text' readOnly value={database.username} />
                </CopyOnClick>
              </div>
              {canViewPassword && (
                <div className='flex flex-col'>
                  <Label className='mb-1'>Password</Label>
                  <div className='flex flex-row min-w-full gap-2'>
                    <CopyOnClick text={database.password}>
                      <Input type='password' readOnly value={database.password ?? ''} className='flex-auto' />
                    </CopyOnClick>
                    {canUpdate && (
                      <RotatePasswordButton databaseId={database.id} onUpdate={appendDatabase} />
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className='flex flex-col'>
              <Label className='mb-1'>JDBC Connection String</Label>
              <CopyOnClick text={jdbcConnectionString}>
                <Input type='password' readOnly value={jdbcConnectionString} />
              </CopyOnClick>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Database row */}
      <div className='bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] border border-[#ffffff12] rounded-xl p-4 hover:border-[#ffffff20] transition-all duration-150'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full'>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-3 mb-2'>
              <div className='flex-shrink-0 w-8 h-8 rounded-lg bg-[#ffffff11] flex items-center justify-center'>
                <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='text-zinc-400'>
                  <ellipse cx='12' cy='5' rx='9' ry='3' /><path d='M3 5V19A9 3 0 0 0 21 19V5' /><path d='M3 12A9 3 0 0 0 21 12' />
                </svg>
              </div>
              <div className='min-w-0 flex-1'>
                <CopyOnClick text={database.name}>
                  <h3 className='text-base font-medium text-zinc-100 truncate'>{database.name}</h3>
                </CopyOnClick>
              </div>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm'>
              <div>
                <p className='text-xs text-zinc-500 uppercase tracking-wide mb-1'>Endpoint</p>
                <CopyOnClick text={database.connectionString}>
                  <p className='text-zinc-300 font-mono truncate'>{database.connectionString}</p>
                </CopyOnClick>
              </div>
              <div>
                <p className='text-xs text-zinc-500 uppercase tracking-wide mb-1'>From</p>
                <CopyOnClick text={database.allowConnectionsFrom}>
                  <p className='text-zinc-300 font-mono truncate'>{database.allowConnectionsFrom}</p>
                </CopyOnClick>
              </div>
              <div>
                <p className='text-xs text-zinc-500 uppercase tracking-wide mb-1'>Username</p>
                <CopyOnClick text={database.username}>
                  <p className='text-zinc-300 font-mono truncate'>{database.username}</p>
                </CopyOnClick>
              </div>
            </div>
          </div>
          <div className='flex items-center gap-2 sm:flex-col sm:gap-3'>
            <Button variant='secondary' size='sm' onClick={() => setConnectionVisible(true)} className='flex items-center gap-2'>
              <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z'/><circle cx='12' cy='12' r='3'/></svg>
              <span className='hidden sm:inline'>Details</span>
            </Button>
            {canDeleteDb && (
              <Button variant='destructive' size='sm' onClick={() => setVisible(true)} className='flex items-center gap-2'>
                <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M3 6h18'/><path d='M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6'/><path d='M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'/></svg>
                <span className='hidden sm:inline'>Delete</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DatabaseRow;
