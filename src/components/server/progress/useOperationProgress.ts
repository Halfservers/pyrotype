import { useCallback, useState } from 'react';

import { SocketEvent } from '@/lib/websocket/events';
import { useWebsocketEvent } from '@/lib/hooks';

export type OperationStatus = 'idle' | 'running' | 'success' | 'error';

interface OperationProgressState {
  operation: string;
  step: number;
  total: number;
  percent: number;
  status: OperationStatus;
}

interface ProgressPayload {
  operation: string;
  step: number;
  total: number;
  status: 'running' | 'success' | 'error';
}

const initialState: OperationProgressState = {
  operation: '',
  step: 0,
  total: 0,
  percent: 0,
  status: 'idle',
};

export const useOperationProgress = (): OperationProgressState & { reset: () => void } => {
  const [state, setState] = useState<OperationProgressState>(initialState);

  useWebsocketEvent(SocketEvent.DAEMON_MESSAGE, useCallback((raw: string) => {
    try {
      const data = JSON.parse(raw) as Partial<ProgressPayload>;
      if (!data.operation || data.step === undefined || data.total === undefined) return;

      const step = Math.max(0, data.step);
      const total = Math.max(1, data.total);
      const percent = Math.min(100, Math.round((step / total) * 100));
      const status: OperationStatus = data.status === 'error'
        ? 'error'
        : data.status === 'success'
          ? 'success'
          : 'running';

      setState({ operation: data.operation, step, total, percent, status });
    } catch {
      // Not a progress message, ignore
    }
  }, []));

  const reset = useCallback(() => setState(initialState), []);

  return { ...state, reset };
};
