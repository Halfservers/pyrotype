import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useServerStore } from '@/store/server';
import { useReinstallServerMutation } from '@/lib/queries';
import { useFlashKey } from '@/lib/hooks';

const ReinstallServerBox = () => {
  const serverId = useServerStore((state) => state.server!.id);
  const [modalVisible, setModalVisible] = useState(false);
  const { clearFlashes, clearAndAddHttpError } = useFlashKey('settings');

  const reinstallMutation = useReinstallServerMutation(serverId);

  const reinstall = () => {
    clearFlashes();
    reinstallMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Your server has begun the reinstallation process.');
        setModalVisible(false);
      },
      onError: (error) => {
        clearAndAddHttpError(error);
        setModalVisible(false);
      },
    });
  };

  return (
    <div className='bg-[#ffffff09] border border-[#ffffff11] rounded-2xl p-6'>
      <h3 className='text-lg font-semibold text-neutral-200 mb-4'>Reinstall Server</h3>
      <AlertDialog open={modalVisible} onOpenChange={setModalVisible}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm server reinstallation</AlertDialogTitle>
            <AlertDialogDescription>
              Your server will be stopped and some files may be deleted or modified during this process, are you sure
              you wish to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={reinstall} disabled={reinstallMutation.isPending}>
              Yes, reinstall server
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <p className='text-sm'>
        Reinstalling your server will stop it, and then re-run the installation script that initially set it up.&nbsp;
        <strong className='font-medium'>
          Some files may be deleted or modified during this process, please back up your data before continuing.
        </strong>
      </p>
      <div className='mt-6 text-right'>
        <Button variant='destructive' onClick={() => setModalVisible(true)}>
          Reinstall Server
        </Button>
      </div>
    </div>
  );
};

export default ReinstallServerBox;
