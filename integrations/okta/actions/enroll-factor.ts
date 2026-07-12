import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('User ID. Example: "00u14y5o7tvvw1qA0698"'),
    factorType: z.string().describe('Factor type. Example: "push", "token:software:totp", "email", "sms", "question"'),
    provider: z.string().describe('Factor provider. Example: "OKTA", "GOOGLE", "YUBICO"'),
    profile: z.record(z.string(), z.unknown()).describe('Factor profile properties. Shape depends on factorType.').optional(),
    activate: z.boolean().describe('Activate the factor immediately after enrollment').optional()
});

const ProviderFactorSchema = z.object({
    id: z.string(),
    factorType: z.string(),
    provider: z.string(),
    vendorName: z.string().optional(),
    status: z.string(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    profile: z.record(z.string(), z.unknown()).optional(),
    _links: z.record(z.string(), z.unknown()).optional(),
    _embedded: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    factorType: z.string(),
    provider: z.string(),
    status: z.string(),
    profile: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Enroll a factor for a user',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.factors.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.okta.com/docs/reference/api/factors/
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}/factors`,
            ...(input.activate !== undefined && {
                params: {
                    activate: String(input.activate)
                }
            }),
            data: {
                factorType: input.factorType,
                provider: input.provider,
                ...(input.profile !== undefined && { profile: input.profile })
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const factor = ProviderFactorSchema.parse(response.data);

        return {
            id: factor.id,
            factorType: factor.factorType,
            provider: factor.provider,
            status: factor.status,
            ...(factor.profile !== undefined && { profile: factor.profile })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
