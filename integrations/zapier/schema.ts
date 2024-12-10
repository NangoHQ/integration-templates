import { z } from 'zod';

export const validateZapierUserSchema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    scope: z.string(),
    client_id: z.string().optional(),
    redirect_uri: z.string().url().optional(),
    referer: z.string().optional(),
    utm_campaign: z.string().optional(),
    utm_content: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_source: z.string().optional()
});

export type ZapierUser = z.infer<typeof validateZapierUserSchema>;
