import { api } from '@/lib/http';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';

export const OPERATION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type OperationStatus = (typeof OPERATION_STATUS)[keyof typeof OPERATION_STATUS];

export const POLLING_CONFIG = {
  INITIAL_INTERVAL: 2000,
  MAX_INTERVAL: 8000,
  MAX_ATTEMPTS: 90,
  JITTER_RANGE: 500,
  BACKOFF_MULTIPLIER: 1.05,
  BACKOFF_THRESHOLD: 5,
};

export interface ServerOperation {
  operation_id: string;
  type: string;
  status: OperationStatus;
  message: string;
  created_at: string;
  updated_at: string;
  parameters?: Record<string, unknown>;
  is_active: boolean;
  is_completed: boolean;
  has_failed: boolean;
}

export const getOperationStatus = async (
  uuid: string,
  operationId: string,
): Promise<ServerOperation> => {
  return api.get<ServerOperation>(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/operations/${operationId}`,
  );
};

export const getServerOperations = async (
  uuid: string,
): Promise<{ operations: ServerOperation[] }> => {
  return api.get(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/operations`);
};

export type PowerAction = 'start' | 'stop' | 'restart' | 'kill';

export const sendPowerAction = async (uuid: string, action: PowerAction): Promise<void> => {
  await api.post(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/power`, {
    signal: action,
  });
};

export const pollOperationStatus = (
  uuid: string,
  operationId: string,
  onUpdate: (operation: ServerOperation) => void,
  onComplete: (operation: ServerOperation) => void,
  onError: (error: Error) => void,
): (() => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let intervalMs = POLLING_CONFIG.INITIAL_INTERVAL;
  let attempts = 0;
  let stopped = false;

  const poll = async () => {
    if (stopped) return;

    try {
      attempts++;

      if (attempts > POLLING_CONFIG.MAX_ATTEMPTS) {
        onError(new Error('Operation polling timed out after 15 minutes'));
        return;
      }

      const operation = await getOperationStatus(uuid, operationId);
      if (stopped) return;

      onUpdate(operation);

      if (operation.is_completed || operation.has_failed) {
        onComplete(operation);
        return;
      }

      if (operation.is_active) {
        if (attempts > POLLING_CONFIG.BACKOFF_THRESHOLD) {
          intervalMs = Math.min(
            intervalMs * POLLING_CONFIG.BACKOFF_MULTIPLIER,
            POLLING_CONFIG.MAX_INTERVAL,
          );
        }
        const jitter = Math.random() * POLLING_CONFIG.JITTER_RANGE;
        timeoutId = setTimeout(poll, intervalMs + jitter);
      } else {
        onError(new Error('Operation is no longer active'));
      }
    } catch (error) {
      if (!stopped) {
        onError(error as Error);
      }
    }
  };

  timeoutId = setTimeout(poll, 1000);

  return () => {
    stopped = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
};
