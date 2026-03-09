import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import copy from 'copy-to-clipboard';
import { Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';

import { api } from '@/lib/http';
import { httpErrorToHuman } from '@/lib/http';
import { useServerStore } from '@/store/server';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import type { ServerEggVariable } from '@/store/server';

const GSL_TOKEN_ENV = 'GSL_TOKEN';

function findGslVariable(variables: ServerEggVariable[]): ServerEggVariable | undefined {
  return variables.find((v) => v.envVariable === GSL_TOKEN_ENV);
}

const GslToken = () => {
  const serverId = useServerStore((s) => s.server?.id ?? '');
  const variables = useServerStore((s) => s.server?.variables ?? []);
  const setServerFromState = useServerStore((s) => s.setServerFromState);
  const [visible, setVisible] = useState(false);

  const gslVar = findGslVariable(variables);
  const tokenValue = gslVar?.serverValue ?? gslVar?.defaultValue ?? '';

  const { mutate: regenerate, isPending } = useMutation({
    mutationFn: async () => {
      const daemonType = getGlobalDaemonType();
      const response = await api.post<{ token: string }>(
        `/api/client/servers/${daemonType}/${serverId}/settings/gsl-token`,
      );
      return response.token;
    },
    onSuccess: (newToken) => {
      setServerFromState((server) => ({
        ...server,
        variables: server.variables.map((v) =>
          v.envVariable === GSL_TOKEN_ENV ? { ...v, serverValue: newToken } : v,
        ),
      }));
      toast.success('GSL token regenerated.');
    },
    onError: (error) => {
      toast.error(httpErrorToHuman(error));
    },
  });

  if (!gslVar) {
    return null;
  }

  const handleCopy = () => {
    if (tokenValue) {
      copy(tokenValue);
      toast.success('GSL token copied to clipboard.');
    }
  };

  const maskedToken = tokenValue ? '*'.repeat(Math.min(tokenValue.length, 32)) : 'Not set';

  return (
    <div className='space-y-2'>
      <Label>GSL Token</Label>
      <div className='flex items-center gap-2'>
        <div className='flex-1 rounded-md border border-[#ffffff12] bg-[#ffffff08] px-3 py-2'>
          <span className='text-sm font-mono text-zinc-300'>
            {visible ? (tokenValue || 'Not set') : maskedToken}
          </span>
        </div>
        <Button
          variant='outline'
          size='icon'
          onClick={() => setVisible(!visible)}
          title={visible ? 'Hide token' : 'Show token'}
        >
          {visible ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
        </Button>
        <Button
          variant='outline'
          size='icon'
          onClick={handleCopy}
          disabled={!tokenValue}
          title='Copy token'
        >
          <Copy className='size-4' />
        </Button>
        <Button
          variant='outline'
          size='icon'
          onClick={() => regenerate()}
          disabled={isPending}
          title='Regenerate token'
        >
          <RefreshCw className={`size-4 ${isPending ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <p className='text-xs text-zinc-500'>
        Game Server Login Token for Steam game servers.
      </p>
    </div>
  );
};

export default GslToken;
