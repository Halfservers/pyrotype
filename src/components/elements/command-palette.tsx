import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  Box,
  Clock,
  Cloud,
  Database,
  FolderOpen,
  Home,
  Network,
  Pencil,
  Power,
  Settings,
  Terminal,
  Users,
} from 'lucide-react';

import Can from '@/components/elements/can';
import { useServerStore } from '@/store/server';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

const CommandMenu = () => {
  const [open, setOpen] = useState(false);
  const id = useServerStore((state) => state.server?.id);
  const status = useServerStore((state) => state.status);
  const socketInstance = useServerStore((state) => state.socketInstance);
  const navigate = useNavigate();

  const cmdkPowerAction = (action: string) => {
    if (socketInstance) {
      if (action === 'start') {
        toast.success('Your server is starting!');
      } else if (action === 'restart') {
        toast.success('Your server is restarting.');
      } else {
        toast.success('Your server is being stopped.');
      }
      setOpen(false);
      socketInstance.send('set state', action === 'kill-confirmed' ? 'kill' : action);
    }
  };

  const cmdkNavigate = (url: string) => {
    navigate({ to: '/server/$id' + url, params: { id: id! } } as any);
    setOpen(false);
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder='Type a command or search...' />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading='Pages'>
          <CommandItem onSelect={() => cmdkNavigate('')}>
            <Home className='mr-2 h-4 w-4' />
            Home
          </CommandItem>
          <Can action='file.*' matchAny>
            <CommandItem onSelect={() => cmdkNavigate('/files')}>
              <FolderOpen className='mr-2 h-4 w-4' />
              Files
            </CommandItem>
          </Can>
          <Can action='database.*' matchAny>
            <CommandItem onSelect={() => cmdkNavigate('/databases')}>
              <Database className='mr-2 h-4 w-4' />
              Databases
            </CommandItem>
          </Can>
          <Can action='backup.*' matchAny>
            <CommandItem onSelect={() => cmdkNavigate('/backups')}>
              <Cloud className='mr-2 h-4 w-4' />
              Backups
            </CommandItem>
          </Can>
          <Can action='allocation.*' matchAny>
            <CommandItem onSelect={() => cmdkNavigate('/network')}>
              <Network className='mr-2 h-4 w-4' />
              Networking
            </CommandItem>
          </Can>
          <Can action='user.*' matchAny>
            <CommandItem onSelect={() => cmdkNavigate('/users')}>
              <Users className='mr-2 h-4 w-4' />
              Users
            </CommandItem>
          </Can>
          <Can action={['startup.*']} matchAny>
            <CommandItem onSelect={() => cmdkNavigate('/startup')}>
              <Terminal className='mr-2 h-4 w-4' />
              Startup
            </CommandItem>
          </Can>
          <Can action={['schedule.*']} matchAny>
            <CommandItem onSelect={() => cmdkNavigate('/schedules')}>
              <Clock className='mr-2 h-4 w-4' />
              Schedules
            </CommandItem>
          </Can>
          <Can action={['settings.*', 'file.sftp']} matchAny>
            <CommandItem onSelect={() => cmdkNavigate('/settings')}>
              <Settings className='mr-2 h-4 w-4' />
              Settings
            </CommandItem>
          </Can>
          <Can action={['activity.*']} matchAny>
            <CommandItem onSelect={() => cmdkNavigate('/activity')}>
              <Pencil className='mr-2 h-4 w-4' />
              Activity
            </CommandItem>
          </Can>
          <Can action={['software.*']} matchAny>
            <CommandItem onSelect={() => cmdkNavigate('/shell')}>
              <Box className='mr-2 h-4 w-4' />
              Software
            </CommandItem>
          </Can>
        </CommandGroup>

        <CommandGroup heading='Server'>
          <Can action='control.start'>
            <CommandItem disabled={status !== 'offline'} onSelect={() => cmdkPowerAction('start')}>
              <Power className='mr-2 h-4 w-4' />
              Start Server
            </CommandItem>
          </Can>
          <Can action='control.restart'>
            <CommandItem disabled={!status} onSelect={() => cmdkPowerAction('restart')}>
              <Power className='mr-2 h-4 w-4' />
              Restart Server
            </CommandItem>
          </Can>
          <Can action='control.restart'>
            <CommandItem disabled={status === 'offline'} onSelect={() => cmdkPowerAction('stop')}>
              <Power className='mr-2 h-4 w-4' />
              Stop Server
            </CommandItem>
          </Can>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandMenu;
