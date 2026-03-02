import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';

function readStorage<S>(key: string, defaultValue: S): S {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as S;
  } catch {
    const raw = localStorage.getItem(key);
    if (raw !== null && typeof defaultValue === 'string') return raw as unknown as S;
    return defaultValue;
  }
}

export function usePersistedState<S = undefined>(
  key: string,
  defaultValue: S,
): [S | undefined, Dispatch<SetStateAction<S | undefined>>] {
  const [state, setState] = useState<S | undefined>(() => readStorage(key, defaultValue));

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}
