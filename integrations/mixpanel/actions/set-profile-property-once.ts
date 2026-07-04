import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    project_token: z.string().describe('Mixpanel project token. Example: "abc123..."')
});

const InputSchema = z.object({
    distinct_id: z.string().describe('User distinct ID. Example: "user-123"'),
    properties: z.record(z.string(), z.unknown()).describe('Properties to set if absent. Example: {"First login date": "2024-01-01"}')
});

const ProviderResponseSchema = z.object({
    status: z.number(),
    error: z.string().nullable().optional()
});

const OutputSchema = z.object({
    status: z.number(),
    error: z.string().optional().nullable()
});

const action = createAction({
    description: 'Set user profile properties only if absent.',
    version: '1.0.0',
    metadata: MetadataSchema,
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();

        if (!metadata.project_token) {
            throw new nango.ActionError({
                type: 'missing_metadata',
                message: 'project_token is required in connection metadata.'
            });
        }

        const response = await nango.post({
            // https://developer.mixpanel.com/reference/profile-set-property-once
            baseUrlOverride: 'https://api.mixpanel.com',
            endpoint: '/engage',
            params: {
                verbose: 1,
                ip: 0
            },
            data: [
                {
                    $token: metadata.project_token,
                    $distinct_id: input.distinct_id,
                    $set_once: input.properties
                }
            ],
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.status !== 1) {
            throw new nango.ActionError({
                type: 'mixpanel_error',
                message: providerResponse.error || 'Failed to set profile property once'
            });
        }

        return {
            status: providerResponse.status,
            ...(providerResponse.error != null && { error: providerResponse.error })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
