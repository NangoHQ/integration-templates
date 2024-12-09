import { z } from 'zod';

export const validateZapierUserSchema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    client_id: z.string(),
    redirect_uri: z.string().url(),
    scope: z.string(),
    referer: z.string().optional(),
    utm_campaign: z.string().optional(),
    utm_content: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_source: z.string().optional()
});

export type ZapierUser = z.infer<typeof validateZapierUserSchema>;
