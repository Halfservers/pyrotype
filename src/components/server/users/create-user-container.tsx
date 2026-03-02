import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import UserFormComponent from '@/components/server/users/user-form-component';

import { useServerStore } from '@/store/server';

const CreateUserContainer = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const serverId = useServerStore((state) => state.server!.id);

  const handleSuccess = () => {
    navigate({ to: '/server/$id/users', params: { id: serverId } } as any);
  };

  const handleCancel = () => {
    navigate({ to: '/server/$id/users', params: { id: serverId } } as any);
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-extrabold tracking-tight'>Create New User</h2>
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
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        flashKey='user:create'
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
      />
    </div>
  );
};

export default CreateUserContainer;
