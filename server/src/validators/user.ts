import { z } from 'zod';

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).max(255).optional(),
  name_first: z.string().min(1).optional(),
  name_last: z.string().min(1).optional(),
  language: z.string().default('en'),
  password: z.string().min(8).optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(255),
  name_first: z.string().min(1),
  name_last: z.string().min(1),
  password: z.string().min(8),
  root_admin: z.boolean().default(false),
});
