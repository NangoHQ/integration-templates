import { z } from 'zod';

export const BitdefenderCompanySchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.number(),
    country: z.string().optional(),
    createdAt: z.string(),
    subscribedServices: z.object({
        endpoint: z.boolean(),
        exchange: z.boolean(),
        network: z.boolean(),
        sos: z.boolean()
    }),
    raw_json: z.string()
});

export type BitdefenderCompany = z.infer<typeof BitdefenderCompanySchema>;
