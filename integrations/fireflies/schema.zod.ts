// Generated by ts-to-zod
import { z } from 'zod';

export const firefliesAddtoLiveInputSchema = z.object({
    query: z.string(),
    variables: z.record(z.any())
});

export const firefliesAddtoLiveResponseSchema = z.object({
    data: z.record(z.any())
});
