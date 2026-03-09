import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SocketEvent } from '@/lib/websocket/events';
import { useWebsocketEvent } from '@/lib/hooks';
import { queryKeys } from '@/lib/queries/keys';
import { useServerStore } from '@/store/server';

type TransferState = 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled';

interface TransferStatus {
  state: TransferState;
  message?: string;
}

const stateConfig: Record<TransferState, {
  icon: React.ReactNode;
  variant: 'default' | 'destructive';
  title: string;
}> = {
  pending: {
    icon: <Loader2 className='size-4 animate-spin' />,
    variant: 'default',
    title: 'Transfer Pending',
  },
  processing: {
    icon: <Loader2 className='size-4 animate-spin' />,
    variant: 'default',
    title: 'Transfer In Progress',
  },
  successful: {
    icon: <CheckCircle className='size-4 text-green-400' />,
    variant: 'default',
    title: 'Transfer Complete',
  },
  failed: {
    icon: <XCircle className='size-4' />,
    variant: 'destructive',
    title: 'Transfer Failed',
  },
  cancelled: {
    icon: <AlertTriangle className='size-4' />,
    variant: 'destructive',
    title: 'Transfer Cancelled',
  },
};

const TERMINAL_STATES: TransferState[] = ['successful', 'failed', 'cancelled'];

const TransferListener = () => {
  const [transfer, setTransfer] = useState<TransferStatus | null>(null);
  const qc = useQueryClient();
  const serverId = useServerStore((s) => s.server?.id ?? '');

  useWebsocketEvent(
    SocketEvent.TRANSFER_STATUS,
    useCallback(
      (raw: string) => {
        let state: TransferState;
        let message: string | undefined;

        try {
          const parsed = JSON.parse(raw) as { status: string; message?: string };
          state = parsed.status as TransferState;
          message = parsed.message;
        } catch {
          state = raw.trim() as TransferState;
        }

        setTransfer({ state, message });

        if (TERMINAL_STATES.includes(state)) {
          if (serverId) {
            qc.invalidateQueries({ queryKey: queryKeys.servers.detail(serverId) });
          }

          if (state === 'successful') {
            toast.success('Server transfer completed successfully.');
          } else if (state === 'failed') {
            toast.error(message ?? 'Server transfer failed.');
          } else {
            toast.warning('Server transfer was cancelled.');
          }
        }
      },
      [qc, serverId],
    ),
  );

  if (!transfer || TERMINAL_STATES.includes(transfer.state)) return null;

  const config = stateConfig[transfer.state];

  return (
    <div className='mb-3 sm:mb-4'>
      <Alert variant={config.variant}>
        {config.icon}
        <AlertTitle>{config.title}</AlertTitle>
        {transfer.message && (
          <AlertDescription>{transfer.message}</AlertDescription>
        )}
      </Alert>
    </div>
  );
};

export default TransferListener;
