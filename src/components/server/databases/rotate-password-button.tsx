import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useFlash } from '@/lib/hooks';
import { useServerStore } from '@/store/server';

import { httpErrorToHuman } from '@/lib/api/http';
import { rotateDatabasePassword, type ServerDatabase } from '@/lib/api/server/databases';

const RotatePasswordButton = ({
  databaseId,
  onUpdate,
}: {
  databaseId: string;
  onUpdate: (database: ServerDatabase) => void;
}) => {
  const [loading, setLoading] = useState(false);
  const { addFlash, clearFlashes } = useFlash();
  const uuid = useServerStore((state) => state.server?.uuid ?? '');

  if (!databaseId) return null;

  const rotate = () => {
    setLoading(true);
    clearFlashes();

    rotateDatabasePassword(uuid, databaseId)
      .then((database: ServerDatabase) => onUpdate(database))
      .catch((error: unknown) => {
        console.error(error);
        addFlash({
          type: 'error',
          title: 'Error',
          message: httpErrorToHuman(error),
          key: 'database-connection-modal',
        });
      })
      .then(() => {
        setTimeout(() => setLoading(false), 500);
      });
  };

  return (
    <Button variant='secondary' onClick={rotate} className='flex-none' disabled={loading}>
      <div className='flex justify-center items-center'>
        {loading ? (
          <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white' />
        ) : (
          <svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2' />
          </svg>
        )}
      </div>
    </Button>
  );
};

export default RotatePasswordButton;
