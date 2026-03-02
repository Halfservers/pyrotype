import type { StateCreator } from 'zustand';

// TODO: import from @/types when available
export interface SiteSettings {
  name: string;
  locale: string;
  timezone: string;
}

export interface SettingsSlice {
  siteSettings: SiteSettings | undefined;
  setSiteSettings: (settings: SiteSettings) => void;
}

export const createSettingsSlice: StateCreator<SettingsSlice> = (set) => ({
  siteSettings: undefined,

  setSiteSettings: (settings) => set({ siteSettings: settings }),
});
