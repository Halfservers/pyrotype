import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/http';
import { httpErrorToHuman } from '@/lib/http';
import { useServerStore } from '@/store/server';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EulaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EulaModal = ({ open, onOpenChange }: EulaModalProps) => {
  const serverId = useServerStore((s) => s.server?.id ?? '');
  const [agreed, setAgreed] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const daemonType = getGlobalDaemonType();
      await api.post(`/api/client/servers/${daemonType}/${serverId}/settings/eula`, {
        accepted: true,
      });
    },
    onSuccess: () => {
      toast.success('EULA accepted successfully.');
      onOpenChange(false);
      setAgreed(false);
    },
    onError: (error) => {
      toast.error(httpErrorToHuman(error));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Minecraft EULA</DialogTitle>
          <DialogDescription>
            By accepting, you agree to the Minecraft End User License Agreement.
            You must accept this before your server can start.
          </DialogDescription>
        </DialogHeader>

        <div className='flex items-center gap-2 py-2'>
          <Checkbox
            id='eula-agree'
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
            disabled={isPending}
          />
          <Label htmlFor='eula-agree' className='text-sm text-zinc-300'>
            I agree to the Minecraft EULA
          </Label>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutate()} disabled={!agreed || isPending}>
            {isPending ? 'Accepting...' : 'Accept'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EulaModal;
