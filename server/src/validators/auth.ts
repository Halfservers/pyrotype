import { z } from 'zod';

export const loginSchema = z.object({
  user: z.string().min(1),
  password: z.string().min(1),
});

export const loginCheckpointSchema = z.object({
  code: z.string().min(6).max(6),
  recoveryToken: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  password_confirmation: z.string().min(8),
}).refine((data) => data.password === data.password_confirmation, {
  message: 'Passwords must match',
  path: ['password_confirmation'],
});
