import { z } from 'zod';

export const BitdefenderCompanySchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.number(),
    country: z.string().optional(),
    subscribedServices: z.object({
        endpoint: z.boolean(),
        exchange: z.boolean(),
        network: z.boolean(),
        sos: z.boolean()
    })
});

export type BitdefenderCompany = z.infer<typeof BitdefenderCompanySchema>;
