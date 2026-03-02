import { Pencil } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import Can from '@/components/elements/can';
import RemoveSubuserButton from '@/components/server/users/remove-subuser-button';

import { useServerStore } from '@/store/server';
import { useAppStore } from '@/store';
import type { Subuser } from '@/store/server';

interface Props {
  subuser: Subuser;
}

const UserRow = ({ subuser }: Props) => {
  const currentUserUuid = useAppStore((state) => state.userData?.uuid);
  const navigate = useNavigate();
  const serverId = useServerStore((state) => state.server!.id);

  return (
    <div className='bg-[#ffffff06] border border-[#ffffff10] rounded-lg p-4 hover:border-[#ffffff15] transition-colors flex items-center gap-4'>
      <div className='w-10 h-10 rounded-full bg-white border-2 border-zinc-800 overflow-hidden hidden md:block'>
        <img className='w-full h-full' src={`${subuser.image}?s=400`} alt={subuser.email} />
      </div>
      <div className='flex-1 overflow-hidden flex flex-col'>
        <p className='truncate text-lg'>{subuser.email}</p>
        <p className='text-xs text-zinc-400 truncate'>
          {subuser.twoFactorEnabled ? 'MFA Enabled' : 'MFA Disabled'}
        </p>
      </div>

      <div className='flex flex-col items-center md:gap-12 gap-4 sm:flex-row'>
        <div>
          <p className='font-medium text-center'>
            {subuser.permissions.filter((permission) => permission !== 'websocket.connect').length}
          </p>
          <p className='text-xs text-zinc-500 uppercase'>Permissions</p>
        </div>
        {subuser.uuid !== currentUserUuid && (
          <div className='flex items-center gap-2'>
            <Can action='user.update'>
              <Button
                variant='outline'
                size='sm'
                onClick={() =>
                  navigate({ to: '/server/$id/users/$userId/edit', params: { id: serverId, userId: subuser.uuid } } as any)
                }
              >
                <Pencil className='w-4 h-4 mr-1' />
                Edit
              </Button>
            </Can>
            <Can action='user.delete'>
              <RemoveSubuserButton subuser={subuser} />
            </Can>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserRow;
