import { useCallback, useRef, useState } from 'react';
import { Terminal } from 'lucide-react';
import { toast } from 'sonner';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SocketEvent } from '@/lib/websocket/events';
import { useWebsocketEvent } from '@/lib/hooks';

const MAX_LINES = 500;

const InstallListener = () => {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const appendLine = useCallback((text: string) => {
    setLines((prev) => {
      const next = [...prev, text];
      return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
    });
    setOpen(true);
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  useWebsocketEvent(SocketEvent.INSTALL_OUTPUT, appendLine);

  useWebsocketEvent(
    SocketEvent.INSTALL_COMPLETED,
    useCallback(() => {
      toast.success('Server installation completed.');
      setLines([]);
      setOpen(false);
    }, []),
  );

  useWebsocketEvent(
    SocketEvent.INSTALL_STARTED,
    useCallback(() => {
      setLines([]);
      setOpen(true);
    }, []),
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side='right' className='w-full sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle className='flex items-center gap-2'>
            <Terminal className='size-4' />
            Installation Output
          </SheetTitle>
          <SheetDescription>
            Server installation is in progress.
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-y-auto bg-[#131313] rounded-md p-3 mx-4 font-mono text-xs'>
          {lines.length === 0 ? (
            <p className='text-zinc-500'>Waiting for output...</p>
          ) : (
            lines.map((line, i) => (
              <div key={i} className='leading-relaxed text-zinc-300 whitespace-pre-wrap'>
                {line}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default InstallListener;
