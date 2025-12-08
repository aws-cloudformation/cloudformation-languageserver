import { z } from 'zod';

export const NonEmptyZodString = z.string().min(1);
export const CfnNameZodString = z.string().min(1).max(128);
