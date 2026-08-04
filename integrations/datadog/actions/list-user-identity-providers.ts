import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('User ID. Example: "00000000-0000-0000-0000-000000000000"')
});

const IdentityProviderOverrideSchema = z
    .object({
        type: z.string(),
        id: z.string().optional(),
        attributes: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        data: z.array(IdentityProviderOverrideSchema).optional(),
        meta: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get identity-provider (SSO) overrides configured for a specific user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/users/#get-identity-provider-overrides-for-a-user
            endpoint: `v2/users/${encodeURIComponent(input.userId)}/identity_providers`,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
