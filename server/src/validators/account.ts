import { z } from 'zod';

export const updateEmailSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updatePasswordSchema = z.object({
  current_password: z.string().min(1),
  password: z.string().min(8),
  password_confirmation: z.string().min(8),
}).refine((data) => data.password === data.password_confirmation, {
  message: 'Passwords must match',
  path: ['password_confirmation'],
});

export const createApiKeySchema = z.object({
  description: z.string().min(1).max(500),
  allowed_ips: z.array(z.string()).optional().default([]),
});

export const createSSHKeySchema = z.object({
  name: z.string().min(1).max(255),
  public_key: z.string().min(1),
});

export const deleteSSHKeySchema = z.object({
  fingerprint: z.string().min(1),
});
