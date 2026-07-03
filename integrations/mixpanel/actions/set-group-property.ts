import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    group_key: z.string().describe('The group key. Example: "company_id"'),
    group_id: z.string().describe('The group ID. Example: "acme-corp"'),
    properties: z.record(z.string(), z.unknown()).describe('Properties to set on the group profile.')
});

const ProviderResponseSchema = z.object({
    status: z.number(),
    error: z.string().nullable().optional()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const ConnectionSchema = z.object({
    metadata: z
        .object({
            region: z.string().optional()
        })
        .passthrough()
        .optional()
});

function resolveIngestionHost(connection: z.infer<typeof ConnectionSchema>): string {
    const region = connection.metadata?.region;
    if (region === 'eu') {
        return 'https://api-eu.mixpanel.com';
    }
    if (region === 'in') {
        return 'https://api-in.mixpanel.com';
    }
    return 'https://api.mixpanel.com';
}

const action = createAction({
    description: 'Set or update group profile properties.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const parsedConnection = ConnectionSchema.parse(connection);
        const host = resolveIngestionHost(parsedConnection);

        const response = await nango.post({
            // https://developer.mixpanel.com/reference/group-set-property
            endpoint: '/groups',
            baseUrlOverride: host,
            params: {
                verbose: 1
            },
            data: [
                {
                    $token: 'service-account',
                    $group_key: input.group_key,
                    $group_id: input.group_id,
                    $set: input.properties
                }
            ],
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.status !== 1) {
            throw new nango.ActionError({
                type: 'api_error',
                message: providerResponse.error || 'Mixpanel group set operation failed'
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
