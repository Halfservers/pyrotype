import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/http';
import { httpErrorToHuman } from '@/lib/http';
import { useServerStore } from '@/store/server';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { ServerEggVariable } from '@/store/server';

const JAVA_VERSION_ENV = 'JAVA_VERSION';

function findJavaVariable(variables: ServerEggVariable[]): ServerEggVariable | undefined {
  return variables.find((v) => v.envVariable === JAVA_VERSION_ENV);
}

function parseOptions(variable: ServerEggVariable): string[] {
  const inMatch = variable.rules.match(/in:([^|]+)/);
  if (inMatch) {
    return inMatch[1].split(',').filter(Boolean);
  }
  return [];
}

const JavaVersionSelector = () => {
  const serverId = useServerStore((s) => s.server?.id ?? '');
  const variables = useServerStore((s) => s.server?.variables ?? []);
  const setServerFromState = useServerStore((s) => s.setServerFromState);

  const javaVar = findJavaVariable(variables);
  const currentValue = javaVar?.serverValue ?? javaVar?.defaultValue ?? '';
  const options = javaVar ? parseOptions(javaVar) : [];

  const { mutate, isPending } = useMutation({
    mutationFn: async (version: string) => {
      const daemonType = getGlobalDaemonType();
      await api.put(
        `/api/client/servers/${daemonType}/${serverId}/startup/variable`,
        { key: JAVA_VERSION_ENV, value: version },
      );
      return version;
    },
    onSuccess: (version) => {
      setServerFromState((server) => ({
        ...server,
        variables: server.variables.map((v) =>
          v.envVariable === JAVA_VERSION_ENV ? { ...v, serverValue: version } : v,
        ),
      }));
      toast.success(`Java version updated to ${version}.`);
    },
    onError: (error) => {
      toast.error(httpErrorToHuman(error));
    },
  });

  if (!javaVar || options.length === 0) {
    return null;
  }

  return (
    <div className='space-y-2'>
      <Label>Java Version</Label>
      <Select
        value={currentValue}
        onValueChange={(value) => mutate(value)}
        disabled={isPending || !javaVar.isEditable}
      >
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Select Java version' />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              Java {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!javaVar.isEditable && (
        <p className='text-xs text-zinc-500'>This variable is not editable.</p>
      )}
    </div>
  );
};

export default JavaVersionSelector;
