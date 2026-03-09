import { useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';

import { ServerContentBlock } from '@/components/layout/page-header';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import DatabaseRow from '@/components/server/databases/database-row';
import { useFlash, usePermissions } from '@/lib/hooks';
import { useServerStore } from '@/store/server';

import { httpErrorToHuman } from '@/lib/http';
import { createServerDatabase, getServerDatabases, type ServerDatabase } from '@/lib/api/server/databases';

const DatabasesContainer = () => {
  const uuid = useServerStore((state) => state.server?.uuid ?? '');
  const databaseLimit = useServerStore((state) => state.server?.featureLimits?.databases ?? 0);
  const databases = useServerStore((state) => state.databases);
  const setDatabases = useServerStore((state) => state.setDatabases);
  const appendDatabase = useServerStore((state) => state.appendDatabase);
  const { addError, clearFlashes } = useFlash();
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [canCreate] = usePermissions(['database.create']);

  const form = useForm({
    defaultValues: { databaseName: '', connectionsFrom: '' },
    onSubmit: async ({ value }) => {
      clearFlashes('database:create');
      try {
        const database = await createServerDatabase(uuid, {
          databaseName: value.databaseName,
          connectionsFrom: value.connectionsFrom || '%',
        });
        form.reset();
        appendDatabase(database);
        setCreateModalVisible(false);
      } catch (error) {
        addError({ key: 'database:create', message: httpErrorToHuman(error) });
      }
    },
  });

  useEffect(() => {
    setLoading(!databases.length);
    clearFlashes('databases');

    getServerDatabases(uuid)
      .then((dbs: ServerDatabase[]) => setDatabases(dbs))
      .catch((error: unknown) => {
        console.error(error);
        addError({ key: 'databases', message: httpErrorToHuman(error) });
      })
      .then(() => setLoading(false));
  }, []);

  return (
    <ServerContentBlock title='Databases'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h2 className='text-xl font-bold'>Databases</h2>
          <p className='text-sm text-neutral-400 leading-relaxed mt-1'>
            Create and manage MySQL databases for your server.
          </p>
        </div>
        {canCreate && (
          <div className='flex flex-col sm:flex-row items-center justify-end gap-4'>
            {databaseLimit === null && (
              <p className='text-sm text-zinc-300'>{databases.length} databases (unlimited)</p>
            )}
            {databaseLimit > 0 && (
              <p className='text-sm text-zinc-300'>
                {databases.length} of {databaseLimit} databases
              </p>
            )}
            {databaseLimit === 0 && (
              <p className='text-sm text-red-400'>Databases disabled</p>
            )}
            {(databaseLimit === null || (databaseLimit > 0 && databaseLimit !== databases.length)) && (
              <Button onClick={() => setCreateModalVisible(true)}>New Database</Button>
            )}
          </div>
        )}
      </div>

      <Dialog open={createModalVisible} onOpenChange={(open) => { if (!open) { form.reset(); setCreateModalVisible(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new database</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className='flex flex-col gap-4'>
            <form.Field
              name='databaseName'
              children={(field) => (
                <div>
                  <Label htmlFor='database_name'>Database Name</Label>
                  <Input
                    id='database_name'
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className='text-xs text-red-400 mt-1'>{field.state.meta.errors.map(String).join(', ')}</p>
                  )}
                  <p className='text-xs text-zinc-400 mt-1'>A descriptive name for your database instance.</p>
                </div>
              )}
            />
            <form.Field
              name='connectionsFrom'
              children={(field) => (
                <div>
                  <Label htmlFor='connections_from'>Connections From</Label>
                  <Input
                    id='connections_from'
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className='text-xs text-red-400 mt-1'>{field.state.meta.errors.map(String).join(', ')}</p>
                  )}
                  <p className='text-xs text-zinc-400 mt-1'>
                    Where connections should be allowed from. Leave blank to allow connections from anywhere.
                  </p>
                </div>
              )}
            />
            <form.Subscribe
              selector={(s) => s.isSubmitting}
              children={(isSubmitting) => (
                <div className='flex gap-3 justify-end'>
                  <Button type='submit' disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Database'}
                  </Button>
                </div>
              )}
            />
          </form>
        </DialogContent>
      </Dialog>

      {!databases.length && loading ? (
        <div className='flex items-center justify-center py-12'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-brand' />
        </div>
      ) : databases.length > 0 ? (
        <div className='flex flex-col gap-3'>
          {databases.map((database) => (
            <DatabaseRow key={database.id} database={database} />
          ))}
        </div>
      ) : (
        <div className='flex flex-col items-center justify-center min-h-[60vh] py-12 px-4'>
          <div className='text-center'>
            <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-[#ffffff11] flex items-center justify-center'>
              <svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='text-zinc-400'>
                <ellipse cx='12' cy='5' rx='9' ry='3' /><path d='M3 5V19A9 3 0 0 0 21 19V5' /><path d='M3 12A9 3 0 0 0 21 12' />
              </svg>
            </div>
            <h3 className='text-lg font-medium text-zinc-200 mb-2'>
              {databaseLimit === 0 ? 'Databases unavailable' : 'No databases found'}
            </h3>
            <p className='text-sm text-zinc-400 max-w-sm'>
              {databaseLimit === 0
                ? 'Databases cannot be created for this server.'
                : 'Your server does not have any databases. Create one to get started.'}
            </p>
          </div>
        </div>
      )}
    </ServerContentBlock>
  );
};

export default DatabasesContainer;
