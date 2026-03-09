import { useEffect, useState } from 'react';

interface UptimeDurationProps {
  uptime: number;
}

function formatDuration(totalSeconds: number): string {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const UptimeDuration = ({ uptime }: UptimeDurationProps) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);

    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [uptime]);

  const totalSeconds = Math.floor(uptime) + elapsed;

  return <span>{formatDuration(totalSeconds)}</span>;
};

export default UptimeDuration;
