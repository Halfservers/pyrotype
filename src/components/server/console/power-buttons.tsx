import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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
import { usePermissions } from '@/lib/hooks';

export type PowerAction = 'start' | 'stop' | 'restart' | 'kill';

interface PowerButtonProps {
  className?: string;
}

const PowerButtons = ({ className }: PowerButtonProps) => {
  const [open, setOpen] = useState(false);
  const status = useServerStore((state) => state.status);
  const instance = useServerStore((state) => state.socketInstance);
  const [canStart] = usePermissions(['control.start']);
  const [canRestart] = usePermissions(['control.restart']);
  const [canStop] = usePermissions(['control.stop']);

  const killable = status === 'stopping';

  const onButtonClick = (action: PowerAction | 'kill-confirmed', e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (action === 'kill') {
      return setOpen(true);
    }

    if (instance) {
      if (action === 'start') toast.success('Your server is starting!');
      else if (action === 'restart') toast.success('Your server is restarting.');
      else toast.success('Your server is being stopped.');

      setOpen(false);
      instance.send('set state', action === 'kill-confirmed' ? 'kill' : action);
    }
  };

  useEffect(() => {
    if (status === 'offline') setOpen(false);
  }, [status]);

  if (!status) return null;

  return (
    <div className={className}>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Forcibly Stop Process</AlertDialogTitle>
            <AlertDialogDescription>
              Forcibly stopping a server can lead to data corruption.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => onButtonClick('kill-confirmed', e as any)}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {canStart && (
        <button
          style={
            status === 'offline'
              ? { background: 'radial-gradient(109.26% 109.26% at 49.83% 13.37%, #FF343C 0%, #F06F53 100%)', opacity: 1 }
              : { background: 'radial-gradient(124.75% 124.75% at 50.01% -10.55%, rgb(36, 36, 36) 0%, rgb(20, 20, 20) 100%)', opacity: 0.5 }
          }
          className='px-8 py-3 border border-[#ffffff12] rounded-l-full rounded-r-md text-sm font-bold shadow-md cursor-pointer'
          disabled={status !== 'offline'}
          onClick={(e) => onButtonClick('start', e)}
        >
          Start
        </button>
      )}
      {canRestart && (
        <button
          style={{ background: 'radial-gradient(124.75% 124.75% at 50.01% -10.55%, rgb(36, 36, 36) 0%, rgb(20, 20, 20) 100%)' }}
          className='px-8 py-3 border border-[#ffffff12] rounded-none text-sm font-bold shadow-md cursor-pointer'
          disabled={!status}
          onClick={(e) => onButtonClick('restart', e)}
        >
          Restart
        </button>
      )}
      {canStop && (
        <button
          style={
            status === 'offline'
              ? { background: 'radial-gradient(124.75% 124.75% at 50.01% -10.55%, rgb(36, 36, 36) 0%, rgb(20, 20, 20) 100%)', opacity: 0.5 }
              : { background: 'radial-gradient(109.26% 109.26% at 49.83% 13.37%, #FF343C 0%, #F06F53 100%)', opacity: 1 }
          }
          className='px-8 py-3 border border-[#ffffff12] rounded-r-full rounded-l-md text-sm font-bold shadow-md transition-all cursor-pointer'
          disabled={status === 'offline'}
          onClick={(e) => onButtonClick(killable ? 'kill' : 'stop', e)}
        >
          {killable ? 'Kill' : 'Stop'}
        </button>
      )}
    </div>
  );
};

export default PowerButtons;
