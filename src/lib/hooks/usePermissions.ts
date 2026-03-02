import { useServerStore } from '@/store/server.ts';

import { useDeepCompareMemo } from './useDeepCompareMemo.ts';

export const usePermissions = (action: string | string[]): boolean[] => {
  const userPermissions = useServerStore((state) => state.serverPermissions);

  return useDeepCompareMemo(() => {
    if (userPermissions[0] === '*') {
      return Array(Array.isArray(action) ? action.length : 1).fill(true) as boolean[];
    }

    return (Array.isArray(action) ? action : [action]).map(
      (permission) =>
        (permission.endsWith('.*') &&
          userPermissions.filter((p) => p.startsWith(permission.split('.')[0] ?? '')).length > 0) ||
        userPermissions.indexOf(permission) >= 0,
    );
  }, [action, userPermissions]);
};
