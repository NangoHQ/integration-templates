// Generated by ts-to-zod
import { z } from 'zod';

export const wildixPbxColleagueSchema = z.object({
    id: z.string(),
    name: z.string(),
    extension: z.string(),
    email: z.string(),
    mobilePhone: z.string(),
    licenseType: z.string(),
    language: z.string()
});