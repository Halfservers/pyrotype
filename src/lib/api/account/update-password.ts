import http from '@/lib/api/http';

interface UpdatePasswordData {
  current: string;
  password: string;
  confirmPassword: string;
}

export default ({ current, password, confirmPassword }: UpdatePasswordData): Promise<void> => {
  return new Promise((resolve, reject) => {
    http
      .put('/api/client/account/password', {
        current_password: current,
        password: password,
        password_confirmation: confirmPassword,
      })
      .then(() => resolve())
      .catch(reject);
  });
};
