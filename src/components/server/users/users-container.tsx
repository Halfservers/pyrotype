import { Plus, User } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import Can from '@/components/elements/can';
import UserRow from '@/components/server/users/user-row';

import { useServerStore } from '@/store/server';
import { useServerSubusersQuery } from '@/lib/queries';
import { useFlashKey } from '@/lib/hooks';

const UsersContainer = () => {
  const navigate = useNavigate();
  const serverId = useServerStore((state) => state.server!.id);
  useFlashKey('users');

  const { data: subusers, isLoading } = useServerSubusersQuery(serverId);

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-2xl font-extrabold tracking-tight'>Users</h2>
            <p className='text-sm text-neutral-400 leading-relaxed mt-1'>
              Manage user access to your server. Grant specific permissions to other users to help you manage and
              maintain your server.
            </p>
          </div>
          <Can action='user.create'>
            <Button onClick={() => navigate({ to: '/server/$id/users/new', params: { id: serverId } } as any)}>
              <Plus className='w-4 h-4 mr-2' />
              New User
            </Button>
          </Can>
        </div>
        <div className='flex items-center justify-center py-12'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-brand' />
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-extrabold tracking-tight'>Users</h2>
          <p className='text-sm text-neutral-400 leading-relaxed mt-1'>
            Manage user access to your server. Grant specific permissions to other users to help you manage and maintain
            your server.
          </p>
        </div>
        <div className='flex items-center gap-4'>
          <p className='text-sm text-zinc-300'>{subusers?.length ?? 0} users</p>
          <Can action='user.create'>
            <Button onClick={() => navigate({ to: '/server/$id/users/new', params: { id: serverId } } as any)}>
              <Plus className='w-4 h-4 mr-2' />
              New User
            </Button>
          </Can>
        </div>
      </div>

      {!subusers?.length ? (
        <div className='flex flex-col items-center justify-center min-h-[60vh] py-12 px-4'>
          <div className='text-center'>
            <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-[#ffffff11] flex items-center justify-center'>
              <User className='w-8 h-8 text-zinc-400' />
            </div>
            <h3 className='text-lg font-medium text-zinc-200 mb-2'>No users found</h3>
            <p className='text-sm text-zinc-400 max-w-sm'>
              Your server does not have any additional users. Add others to help you manage your server.
            </p>
          </div>
        </div>
      ) : (
        <div className='space-y-2'>
          {subusers.map((subuser) => (
            <UserRow key={subuser.uuid} subuser={subuser} />
          ))}
        </div>
      )}
    </div>
  );
};

export default UsersContainer;
