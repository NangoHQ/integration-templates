import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Background job ID. Example: "6a441298bce6853f4c4c0fc0"')
});

const ProviderBackgroundJobSchema = z
    .object({
        id: z.string(),
        status: z.enum(['pending', 'running', 'success', 'failed']),
        progress: z.number(),
        data: z.unknown().optional(),
        type: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a background job.',
    version: '1.0.0',
    input: InputSchema,
    output: ProviderBackgroundJobSchema,
    scopes: ['background-jobs:read', 'all:read'],
    endpoint: {
        path: '/actions/get-background-job',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof ProviderBackgroundJobSchema>> => {
        const response = await nango.get({
            // https://developer.instantly.ai/api-reference/groups/background-job
            endpoint: `/v2/background-jobs/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const providerJob = ProviderBackgroundJobSchema.parse(response.data);

        return providerJob;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
