import { useServerStore } from '@/store/server';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(1)} ${units[i]}`;
}

const SteamDiskSpace = () => {
  const diskLimit = useServerStore((s) => s.server?.limits.disk ?? 0);

  // disk limit is in MB from the API
  const totalBytes = diskLimit * 1024 * 1024;

  if (diskLimit === 0) {
    return (
      <div className='space-y-2'>
        <Label>Disk Usage</Label>
        <p className='text-sm text-zinc-400'>Unlimited disk space</p>
      </div>
    );
  }

  // We show the allocated limit as a static display since actual usage
  // comes from the stats websocket which is handled elsewhere
  const percentage = 0;

  return (
    <div className='space-y-2'>
      <Label>Disk Allocation</Label>
      <Progress value={percentage} className='h-3' />
      <div className='flex items-center justify-between text-xs text-zinc-500'>
        <span>Allocated: {formatBytes(totalBytes)}</span>
        <span>{diskLimit === 0 ? 'Unlimited' : formatBytes(totalBytes)}</span>
      </div>
    </div>
  );
};

export default SteamDiskSpace;
