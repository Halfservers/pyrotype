import type { StateCreator } from 'zustand';

// TODO: import from @/types when available
export interface UserData {
  uuid: string;
  username: string;
  email: string;
  language: string;
  rootAdmin: boolean;
  useTotp: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSlice {
  userData: UserData | undefined;
  setUserData: (data: UserData) => void;
  updateUserData: (data: Partial<UserData>) => void;
  updateUserEmail: (email: string) => void;
}

export const createUserSlice: StateCreator<UserSlice> = (set) => ({
  userData: undefined,

  setUserData: (data) => set({ userData: data }),

  updateUserData: (data) =>
    set((state) => ({
      userData: state.userData ? { ...state.userData, ...data } : undefined,
    })),

  updateUserEmail: (email) =>
    set((state) => ({
      userData: state.userData ? { ...state.userData, email } : undefined,
    })),
});
