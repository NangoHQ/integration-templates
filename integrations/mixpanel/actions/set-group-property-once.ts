import { z } from 'zod';
import { createAction } from 'nango';

function resolveIngestionHost(region: string | undefined | null): string {
    const normalized = region?.trim().toLowerCase();

    if (normalized === 'eu' || normalized === 'api-eu') {
        return 'https://api-eu.mixpanel.com';
    }

    if (normalized === 'in' || normalized === 'api-in') {
        return 'https://api-in.mixpanel.com';
    }

    return 'https://api.mixpanel.com';
}

const InputSchema = z.object({
    token: z.string().describe('The Mixpanel project token. Example: "abc123..."'),
    group_key: z.string().describe('The group key. Example: "company"'),
    group_id: z.string().describe('The group ID. Example: "nango"'),
    properties: z.record(z.string(), z.unknown()).describe('Properties to set once on the group profile.'),
    region: z.enum(['us', 'eu', 'in']).optional().describe('Data residency region. Defaults to us.')
});

const ProviderResponseSchema = z.object({
    status: z.number().optional(),
    error: z.string().nullable().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    error: z.string().optional()
});

const action = createAction({
    description: 'Set group profile properties only if absent.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const baseUrl = resolveIngestionHost(input.region);

        const response = await nango.post({
            // https://developer.mixpanel.com/reference/group-set-property-once
            baseUrlOverride: baseUrl,
            endpoint: '/groups',
            data: [
                {
                    $token: input.token,
                    $group_key: input.group_key,
                    $group_id: input.group_id,
                    $set_once: input.properties
                }
            ],
            params: {
                verbose: 1
            },
            retries: 1
        });

        const data =
            typeof response.data === 'object' && response.data !== null
                ? ProviderResponseSchema.parse(response.data)
                : ProviderResponseSchema.parse({ status: Number(response.data), error: null });

        if (data.status !== 1) {
            throw new nango.ActionError({
                type: 'mixpanel_error',
                message: data.error || 'Failed to set group property once'
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
