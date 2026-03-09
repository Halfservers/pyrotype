import { useServerStore } from '@/store/server';
import { Label } from '@/components/ui/label';

import type { ServerEggVariable } from '@/store/server';

const PID_LIMIT_ENV = 'PID_LIMIT';

function findPidVariable(variables: ServerEggVariable[]): ServerEggVariable | undefined {
  return variables.find((v) => v.envVariable === PID_LIMIT_ENV);
}

const PidLimitDisplay = () => {
  const variables = useServerStore((s) => s.server?.variables ?? []);
  const pidVar = findPidVariable(variables);

  if (!pidVar) {
    return null;
  }

  const value = pidVar.serverValue ?? pidVar.defaultValue ?? 'N/A';

  return (
    <div className='space-y-2'>
      <Label>PID Limit</Label>
      <div className='flex items-center gap-2 rounded-md border border-[#ffffff12] bg-[#ffffff08] px-3 py-2'>
        <span className='text-sm text-zinc-300'>{value}</span>
        <span className='text-xs text-zinc-500'>(read-only)</span>
      </div>
      <p className='text-xs text-zinc-500'>
        Maximum number of processes this server can create.
      </p>
    </div>
  );
};

export default PidLimitDisplay;
