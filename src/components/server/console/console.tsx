import { useEffect, useRef, useState } from 'react';

import { SocketEvent, SocketRequest } from '@/lib/websocket/events';
import { useServerStore } from '@/store/server';
import { usePermissions, usePersistedState } from '@/lib/hooks';

const theme = {
  background: '#131313',
  cursor: 'transparent',
  black: '#000000',
  red: '#E54B4B',
  green: '#9ECE58',
  yellow: '#FAED70',
  blue: '#396FE2',
  magenta: '#BB80B3',
  cyan: '#2DDAFD',
  white: '#d0d0d0',
  brightBlack: 'rgba(255, 255, 255, 0.2)',
  brightRed: '#FF5370',
  brightGreen: '#C3E88D',
  brightYellow: '#FFCB6B',
  brightBlue: '#82AAFF',
  brightMagenta: '#C792EA',
  brightCyan: '#89DDFF',
  brightWhite: '#ffffff',
  selection: '#FAF089',
};

const Console = () => {
  const TERMINAL_PRELUDE = '\u001b[1m\u001b[33mcontainer@pyrotype~ \u001b[0m';
  const ref = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const connected = useServerStore((state) => state.socketConnected);
  const instance = useServerStore((state) => state.socketInstance);
  const [canSendCommands] = usePermissions(['control.console']);
  const serverId = useServerStore((state) => state.server?.id ?? '');
  const isTransferring = useServerStore((state) => state.server?.isTransferring ?? false);
  const [history, setHistory] = usePersistedState<string[]>(`${serverId}:command_history`, []);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!connected || !ref.current || initialized) return;

    let cancelled = false;

    const initTerminal = async () => {
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      const { SearchAddon } = await import('@xterm/addon-search');
      const { WebLinksAddon } = await import('@xterm/addon-web-links');

      if (cancelled) return;

      const terminal = new Terminal({
        disableStdin: true,
        cursorStyle: 'underline',
        allowTransparency: true,
        fontSize: window.innerWidth < 640 ? 11 : 12,
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
        theme,
        rows: window.innerWidth < 640 ? 20 : 25,
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.loadAddon(new SearchAddon());
      terminal.loadAddon(new WebLinksAddon());

      terminal.open(ref.current!);
      fitAddon.fit();

      terminal.attachCustomKeyEventHandler((e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
          document.execCommand('copy');
          return false;
        }
        return true;
      });

      terminalRef.current = terminal;
      fitAddonRef.current = fitAddon;
      setInitialized(true);
    };

    initTerminal();
    return () => { cancelled = true; };
  }, [connected]);

  useEffect(() => {
    const handleResize = () => {
      if (terminalRef.current && fitAddonRef.current) {
        const newFontSize = window.innerWidth < 640 ? 11 : 12;
        terminalRef.current.options.fontSize = newFontSize;
        fitAddonRef.current.fit();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!connected || !instance || !terminal) return;

    const handleConsoleOutput = (line: string, prelude = false) =>
      terminal.writeln((prelude ? TERMINAL_PRELUDE : '') + line.replace(/(?:\r\n|\r|\n)$/im, '') + '\u001b[0m');

    const handleDaemonError = (line: string) =>
      terminal.writeln(TERMINAL_PRELUDE + '\u001b[1m\u001b[41m' + line.replace(/(?:\r\n|\r|\n)$/im, '') + '\u001b[0m');

    const handlePowerChange = (state: string) =>
      terminal.writeln(TERMINAL_PRELUDE + 'Server marked as ' + state + '...\u001b[0m');

    const handleTransferStatus = (status: string) => {
      if (status === 'failure') terminal.writeln(TERMINAL_PRELUDE + 'Transfer has failed.\u001b[0m');
    };

    const listeners: Record<string, (s: string) => void> = {
      [SocketEvent.STATUS]: handlePowerChange,
      [SocketEvent.CONSOLE_OUTPUT]: handleConsoleOutput,
      [SocketEvent.INSTALL_OUTPUT]: handleConsoleOutput,
      [SocketEvent.TRANSFER_LOGS]: handleConsoleOutput,
      [SocketEvent.TRANSFER_STATUS]: handleTransferStatus,
      [SocketEvent.DAEMON_MESSAGE]: (line) => handleConsoleOutput(line, true),
      [SocketEvent.DAEMON_ERROR]: handleDaemonError,
    };

    if (!isTransferring) terminal.clear();

    for (const [key, listener] of Object.entries(listeners)) {
      instance.addListener(key, listener);
    }
    instance.send(SocketRequest.SEND_LOGS);

    return () => {
      for (const [key, listener] of Object.entries(listeners)) {
        instance.removeListener(key, listener);
      }
    };
  }, [connected, instance, initialized]);

  const handleCommandKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      const newIndex = Math.min(historyIndex + 1, (history?.length ?? 0) - 1);
      setHistoryIndex(newIndex);
      e.currentTarget.value = history?.[newIndex] || '';
      e.preventDefault();
    }

    if (e.key === 'ArrowDown') {
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      e.currentTarget.value = history?.[newIndex] || '';
    }

    const command = e.currentTarget.value;
    if (e.key === 'Enter' && command.length > 0) {
      setHistory((prev) => [command, ...(prev ?? [])].slice(0, 32));
      setHistoryIndex(-1);
      if (instance) instance.send('send command', command);
      e.currentTarget.value = '';
    }
  };

  return (
    <div className='bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] border border-[#ffffff12] rounded-xl hover:border-[#ffffff20] transition-all duration-150 overflow-hidden shadow-sm'>
      <div className='relative'>
        {!connected && (
          <div className='absolute inset-0 flex items-center justify-center bg-black/50 z-10'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white' />
          </div>
        )}
        <div className='bg-[#131313] min-h-[280px] sm:min-h-[380px] p-3 sm:p-4 font-mono overflow-hidden'>
          <div className='h-full w-full'>
            <div ref={ref} className='h-full w-full' />
          </div>
        </div>
        {canSendCommands && (
          <div className='relative border-t border-[#ffffff11] bg-[#0f0f0f]'>
            <input
              className='w-full bg-transparent px-3 py-2.5 sm:px-4 sm:py-3 font-mono text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 border-0 outline-none focus:ring-0 focus:outline-none focus:bg-[#1a1a1a] transition-colors duration-150'
              type='text'
              placeholder='Enter a command...'
              aria-label='Console command input.'
              disabled={!instance || !connected}
              onKeyDown={handleCommandKeyDown}
              autoCorrect='off'
              autoCapitalize='none'
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Console;
