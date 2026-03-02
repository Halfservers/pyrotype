import { create } from 'zustand';

import type { FlashSlice } from '@/store/slices/flash.ts';
import { createFlashSlice } from '@/store/slices/flash.ts';
import type { PermissionsSlice } from '@/store/slices/permissions.ts';
import { createPermissionsSlice } from '@/store/slices/permissions.ts';
import type { ProgressSlice } from '@/store/slices/progress.ts';
import { createProgressSlice } from '@/store/slices/progress.ts';
import type { SettingsSlice } from '@/store/slices/settings.ts';
import { createSettingsSlice } from '@/store/slices/settings.ts';
import type { UserSlice } from '@/store/slices/user.ts';
import { createUserSlice } from '@/store/slices/user.ts';

export type AppStore = UserSlice & SettingsSlice & PermissionsSlice & FlashSlice & ProgressSlice;

export const useAppStore = create<AppStore>()((...a) => ({
  ...createUserSlice(...a),
  ...createSettingsSlice(...a),
  ...createPermissionsSlice(...a),
  ...createFlashSlice(...a),
  ...createProgressSlice(...a),
}));
