import { api } from '@/lib/http';

interface UpdatePasswordData {
  current: string;
  password: string;
  confirmPassword: string;
}

export default async ({ current, password, confirmPassword }: UpdatePasswordData): Promise<void> => {
  await api.put('/api/client/account/password', {
    current_password: current,
    password: password,
    password_confirmation: confirmPassword,
  });
};
