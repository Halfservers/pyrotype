import type { DependencyList, EffectCallback } from 'react';
import { useEffect } from 'react';

import { useDeepMemoize } from './useDeepMemoize.ts';

export const useDeepCompareEffect = (callback: EffectCallback, dependencies: DependencyList): void => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(callback, useDeepMemoize(dependencies));
};
