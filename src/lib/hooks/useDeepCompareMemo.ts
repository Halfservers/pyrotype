import type { DependencyList } from 'react';
import { useMemo } from 'react';

import { useDeepMemoize } from './useDeepMemoize.ts';

export const useDeepCompareMemo = <T>(callback: () => T, dependencies: DependencyList): T =>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(callback, useDeepMemoize(dependencies));
