import { api, ApiError } from '@/lib/http';
import type { UserData } from '@/store/slices/user';

export interface LoginData {
  user: string;
  password: string;
  [key: string]: string;
}

export interface LoginResponse {
  complete: boolean;
  intended?: string;
  confirmationToken?: string;
  user?: UserData;
  error?: string;
}

interface RawUserAttributes {
  uuid: string;
  username: string;
  email: string;
  language: string;
  root_admin: boolean;
  use_totp: boolean;
  created_at: string;
  updated_at: string;
}

function transformUser(attrs: RawUserAttributes): UserData {
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
    await api.get('/api/sanctum/csrf-cookie');

    interface RawLoginData {
      complete?: boolean;
      intended?: string;
      confirmation_token?: string;
      confirmationToken?: string;
      error?: string;
      message?: string;
      user?: { attributes: RawUserAttributes };
    }

    const response = await api.post<RawLoginData & { data?: RawLoginData }>('/api/auth/login', { ...data });

    if (!response || typeof response !== 'object') {
      throw new Error('Invalid server response format');
    }

    const d: RawLoginData = response.data ?? response;

    return {
      complete: d.complete ?? false,
      intended: d.intended,
      confirmationToken: d.confirmation_token ?? d.confirmationToken,
      user: d.user?.attributes ? transformUser(d.user.attributes) : undefined,
      error: d.error ?? d.message,
    };
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      const loginError = new Error(
        error.errors[0]?.detail ?? error.message ?? 'Login failed. Please try again.',
      ) as Error & { response?: unknown; detail?: string; code?: string };
      loginError.response = { status: error.status, data: { errors: error.errors } };
      loginError.detail = error.errors[0]?.detail;
      loginError.code = error.errors[0]?.code;
      throw loginError;
    }

    const message = error instanceof Error ? error.message : 'Login failed. Please try again.';
    throw new Error(message);
  }
};
