import type { StateCreator } from 'zustand';

// TODO: import from @/types when available
export interface PanelPermissions {
  [key: string]: {
    description: string;
    keys: { [k: string]: string };
  };
}

export interface PermissionsSlice {
  panelPermissions: PanelPermissions;
  setPanelPermissions: (permissions: PanelPermissions) => void;
}

export const createPermissionsSlice: StateCreator<PermissionsSlice> = (set) => ({
  panelPermissions: {},

  setPanelPermissions: (permissions) => set({ panelPermissions: permissions }),
});
