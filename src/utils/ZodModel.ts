import { z } from 'zod';

export const NonEmptyZodString = z.string().trim().min(1);
export const CfnNameZodString = z.string().trim().min(1).max(128);
