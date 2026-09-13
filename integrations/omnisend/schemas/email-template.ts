import * as z from 'zod';
import { emailContentSchema } from './email-content.js';

export const emailTemplateSchema = emailContentSchema.extend({ name: z.string().max(255).optional() });