// Generated by ts-to-zod
import { z } from 'zod';

export const evaluAgentGroupSchema = z.object({
    id: z.string(),
    name: z.string(),
    level: z.string(),
    active: z.boolean(),
    parent: z.string(),
    hasChildren: z.boolean(),
    isCustomReportingGroup: z.boolean()
});

export const evaluAgentUserSchema = z.object({
    id: z.string(),
    forename: z.string(),
    surname: z.string(),
    email: z.string(),
    username: z.string(),
    startDate: z.date(),
    active: z.boolean(),
    thirdPartyId: z.union([z.string(), z.number()])
});

export const evaluAgentRoleSchema = z.object({
    id: z.string(),
    title: z.string(),
    name: z.string()
});
