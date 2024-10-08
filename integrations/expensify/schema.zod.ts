// Generated by ts-to-zod
import { z } from 'zod';

export const requestJobDescriptionSchema = z.object({
    type: z.string()
});

export const inputSettingsSchema = z.object({
    type: z.string()
});

export const expensifyListPolicyInputSchema = z.object({
    requestJobDescription: requestJobDescriptionSchema,
    inputSettings: inputSettingsSchema
});

export const expensifyListPolicyOutputSchema = z.object({
    policyList: z.array(z.any())
});
