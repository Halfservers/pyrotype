import { CheckCircle, Loader2, XCircle } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

import { type OperationStatus, useOperationProgress } from './useOperationProgress';

const statusIcon: Record<Exclude<OperationStatus, 'idle'>, React.ReactNode> = {
  running: <Loader2 className='size-5 animate-spin text-blue-400' />,
  success: <CheckCircle className='size-5 text-green-400' />,
  error: <XCircle className='size-5 text-red-400' />,
};

const statusLabel: Record<Exclude<OperationStatus, 'idle'>, string> = {
  running: 'In progress...',
  success: 'Completed',
  error: 'Failed',
};

const OperationProgressModal = () => {
  const { operation, step, total, percent, status } = useOperationProgress();

  if (status === 'idle') return null;

  return (
    <Dialog open modal>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            {statusIcon[status]}
            {operation || 'Operation'}
          </DialogTitle>
          <DialogDescription>{statusLabel[status]}</DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-3'>
          <Progress value={percent} />
          <div className='flex items-center justify-between text-sm text-zinc-400'>
            <span>
              Step {step} of {total}
            </span>
            <span>{percent}%</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OperationProgressModal;
