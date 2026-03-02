import { z } from 'zod';

export const updateEmailSchema = z.object({
  email: z.string().email('A valid email address must be provided.'),
  password: z.string().min(1, 'You must provide your current account password.'),
});

export type UpdateEmailData = z.infer<typeof updateEmailSchema>;

export const updatePasswordSchema = z
  .object({
    current: z.string().min(1, 'You must provide your current account password.'),
    password: z.string().min(8, 'Your new password should be at least 8 characters in length.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password confirmation does not match the password you entered.',
    path: ['confirmPassword'],
  });

export type UpdatePasswordData = z.infer<typeof updatePasswordSchema>;

export const createApiKeySchema = z.object({
  description: z
    .string()
    .min(4, 'Description must be at least 4 characters.')
    .max(500, 'Description must not exceed 500 characters.'),
  allowedIps: z.string(),
});

export type CreateApiKeyData = z.infer<typeof createApiKeySchema>;

export const sshKeySchema = z.object({
  name: z.string().min(1, 'SSH Key Name is required.'),
  publicKey: z.string().min(1, 'Public Key is required.'),
});

export type SshKeyData = z.infer<typeof sshKeySchema>;
