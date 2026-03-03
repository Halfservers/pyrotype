import { AlertTriangle, Download, RotateCcw } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useServerStore } from '@/store/server';

const CONFLICT_STATUSES = [
  'installing',
  'install_failed',
  'suspended',
  'restoring_backup',
] as const;

type ConflictStatus = (typeof CONFLICT_STATUSES)[number];

interface ConflictConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const conflictConfig: Record<ConflictStatus, ConflictConfig> = {
  installing: {
    icon: <Download className='size-5 animate-pulse' />,
    title: 'Server Installing',
    description:
      'This server is currently being installed. Please wait for the installation to complete before accessing server features.',
  },
  install_failed: {
    icon: <AlertTriangle className='size-5 text-red-400' />,
    title: 'Installation Failed',
    description:
      'The server installation has failed. Please contact support or try reinstalling the server.',
  },
  suspended: {
    icon: <AlertTriangle className='size-5 text-yellow-400' />,
    title: 'Server Suspended',
    description:
      'This server has been suspended. Please contact your administrator for more information.',
  },
  restoring_backup: {
    icon: <RotateCcw className='size-5 animate-spin' />,
    title: 'Restoring Backup',
    description:
      'A backup is currently being restored. Server features will be available once the restoration completes.',
  },
};

function isConflictStatus(status: string | null): status is ConflictStatus {
  return status !== null && (CONFLICT_STATUSES as readonly string[]).includes(status);
}

interface ConflictStateRendererProps {
  children: React.ReactNode;
}

const ConflictStateRenderer = ({ children }: ConflictStateRendererProps) => {
  const serverStatus = useServerStore((s) => s.server?.status ?? null);

  if (!isConflictStatus(serverStatus)) {
    return <>{children}</>;
  }

  const config = conflictConfig[serverStatus];

  return (
    <div className='relative min-h-[400px]'>
      <div className='pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm'>
        <div className='max-w-md px-4'>
          <Alert variant='destructive' className='border-zinc-700 bg-zinc-900/90'>
            {config.icon}
            <AlertTitle className='text-lg'>{config.title}</AlertTitle>
            <AlertDescription className='mt-2'>{config.description}</AlertDescription>
          </Alert>
        </div>
      </div>
      <div className='pointer-events-none select-none opacity-20'>{children}</div>
    </div>
  );
};

export default ConflictStateRenderer;
