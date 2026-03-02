import { ChevronLeft, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import UserFormComponent from '@/components/server/users/user-form-component';

import { useServerStore } from '@/store/server';

const EditUserContainer = () => {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { id: string; userId?: string };
  const userId = params.userId;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const serverId = useServerStore((state) => state.server!.id);
  const subusers = useServerStore((state) => state.subusers);
  const subuser = subusers.find((s) => s.uuid === userId);

  useEffect(() => {
    if (!subuser && subusers.length > 0) {
      navigate({ to: '/server/$id/users', params: { id: serverId } } as any);
    }
  }, [subuser, subusers, navigate, serverId]);

  const handleSuccess = () => {
    navigate({ to: '/server/$id/users', params: { id: serverId } } as any);
  };

  const handleCancel = () => {
    navigate({ to: '/server/$id/users', params: { id: serverId } } as any);
  };

  if (!subuser && subusers.length === 0) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-extrabold tracking-tight'>Edit User</h2>
          <Button variant='outline' onClick={() => navigate({ to: '/server/$id/users', params: { id: serverId } } as any)}>
            <ChevronLeft className='w-4 h-4 mr-2' />
            Back to Users
          </Button>
        </div>
        <div className='flex items-center justify-center py-12'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-brand' />
        </div>
      </div>
    );
  }

  if (!subuser) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-extrabold tracking-tight'>Edit User</h2>
          <Button variant='outline' onClick={() => navigate({ to: '/server/$id/users', params: { id: serverId } } as any)}>
            <ChevronLeft className='w-4 h-4 mr-2' />
            Back to Users
          </Button>
        </div>
        <div className='flex flex-col items-center justify-center py-12 px-4'>
          <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-[#ffffff11] flex items-center justify-center'>
            <User className='w-8 h-8 text-zinc-400' />
          </div>
          <h3 className='text-lg font-medium text-zinc-200 mb-2'>User not found</h3>
          <p className='text-sm text-zinc-400 max-w-sm'>The user you&apos;re trying to edit could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-extrabold tracking-tight'>Edit User: {subuser.email}</h2>
        <Button
          variant='outline'
          onClick={() => navigate({ to: '/server/$id/users', params: { id: serverId } } as any)}
          disabled={isSubmitting}
        >
          <ChevronLeft className='w-4 h-4 mr-2' />
          Back to Users
        </Button>
      </div>

      <UserFormComponent
        subuser={subuser}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        flashKey='user:edit'
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
      />
    </div>
  );
};

export default EditUserContainer;
