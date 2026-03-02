import { z } from 'zod';

export const loginSchema = z.object({
  user: z.string().min(1, 'A username or email must be provided.'),
  password: z.string().min(1, 'Please enter your account password.'),
});

export type LoginData = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
});

export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Your new password should be at least 8 characters in length.'),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Your new password does not match.',
    path: ['passwordConfirmation'],
  });

export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

export const loginCheckpointSchema = z.object({
  code: z.string().length(6, 'Authentication code must be 6 digits.').regex(/^\d{6}$/, 'Authentication code must be 6 digits.'),
});

export type LoginCheckpointData = z.infer<typeof loginCheckpointSchema>;
