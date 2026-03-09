import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'OTHER';

interface ParsedLine {
  level: LogLevel;
  text: string;
  index: number;
}

interface McLogsViewerProps {
  lines: string[];
  maxHeight?: string;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  INFO: 'text-blue-400',
  WARN: 'text-yellow-400',
  ERROR: 'text-red-400',
  OTHER: 'text-zinc-300',
};

const LEVEL_PATTERN = /\b(INFO|WARN(?:ING)?|ERROR|SEVERE|FATAL)\b/i;

function classifyLevel(line: string): LogLevel {
  const match = LEVEL_PATTERN.exec(line);
  if (!match) return 'OTHER';
  const level = match[1].toUpperCase();
  if (level === 'WARNING' || level === 'WARN') return 'WARN';
  if (level === 'SEVERE' || level === 'FATAL' || level === 'ERROR') return 'ERROR';
  if (level === 'INFO') return 'INFO';
  return 'OTHER';
}

const ALL_LEVELS: LogLevel[] = ['INFO', 'WARN', 'ERROR', 'OTHER'];

const McLogsViewer = ({ lines, maxHeight = '400px' }: McLogsViewerProps) => {
  const [activeFilters, setActiveFilters] = useState<Set<LogLevel>>(
    () => new Set(ALL_LEVELS),
  );

  const parsed = useMemo<ParsedLine[]>(
    () =>
      lines.map((text, index) => ({
        level: classifyLevel(text),
        text,
        index,
      })),
    [lines],
  );

  const filtered = useMemo(
    () => parsed.filter((line) => activeFilters.has(line.level)),
    [parsed, activeFilters],
  );

  const toggleFilter = useCallback((level: LogLevel) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        if (next.size === 1) return next;
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  }, []);

  const counts = useMemo(() => {
    const map: Record<LogLevel, number> = { INFO: 0, WARN: 0, ERROR: 0, OTHER: 0 };
    for (const line of parsed) {
      map[line.level]++;
    }
    return map;
  }, [parsed]);

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex flex-wrap gap-1.5'>
        {ALL_LEVELS.map((level) => (
          <Button
            key={level}
            variant={activeFilters.has(level) ? 'default' : 'outline'}
            size='xs'
            onClick={() => toggleFilter(level)}
          >
            <span className={LEVEL_COLORS[level]}>{level}</span>
            <span className='ml-1 text-xs opacity-60'>({counts[level]})</span>
          </Button>
        ))}
      </div>

      <div
        className='overflow-y-auto rounded-md border bg-[#131313] p-3 font-mono text-xs'
        style={{ maxHeight }}
      >
        {filtered.length === 0 ? (
          <p className='text-zinc-500'>No log lines match the selected filters.</p>
        ) : (
          filtered.map((line) => (
            <div key={line.index} className='leading-relaxed'>
              <span className='mr-2 select-none text-zinc-600'>
                {String(line.index + 1).padStart(4, ' ')}
              </span>
              <span className={LEVEL_COLORS[line.level]}>{line.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default McLogsViewer;
