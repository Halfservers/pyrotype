import http from '@/lib/api/http';
import type { UserData } from '@/store/slices/user';

export interface LoginData {
  user: string;
  password: string;
  [key: string]: any;
}

export interface LoginResponse {
  complete: boolean;
  intended?: string;
  confirmationToken?: string;
  user?: UserData;
  error?: string;
}

function transformUser(attrs: any): UserData {
  return {
    uuid: attrs.uuid,
    username: attrs.username,
    email: attrs.email,
    language: attrs.language,
    rootAdmin: attrs.root_admin,
    useTotp: attrs.use_totp,
    createdAt: new Date(attrs.created_at),
    updatedAt: new Date(attrs.updated_at),
  };
}

export default async (data: LoginData): Promise<LoginResponse> => {
  try {
    await http.get('/api/sanctum/csrf-cookie');

    const response = await http.post('/api/auth/login', { ...data });

    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Invalid server response format');
    }

    const d = response.data.data ?? response.data;

    return {
      complete: d.complete ?? false,
      intended: d.intended,
      confirmationToken: d.confirmation_token ?? d.confirmationToken,
      user: d.user?.attributes ? transformUser(d.user.attributes) : undefined,
      error: d.error ?? d.message,
    };
  } catch (error: any) {
    const loginError = new Error(
      error.response?.data?.error ??
        error.response?.data?.message ??
        error.message ??
        'Login failed. Please try again.',
    ) as any;

    loginError.response = error.response;
    loginError.detail = error.response?.data?.errors?.[0]?.detail;
    loginError.code = error.response?.data?.errors?.[0]?.code;

    throw loginError;
  }
};
