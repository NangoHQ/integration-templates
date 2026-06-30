import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Webhook ID. Example: "019f1a0f-1a3c-7828-801d-069c4b11cf00"')
});

const OutputSchema = z
    .object({
        success: z.boolean(),
        response_time_ms: z.number(),
        status_code: z.number(),
        error: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Send a test delivery to a webhook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    endpoint: {
        path: '/actions/test-webhook',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.instantly.ai/api-reference/groups/webhook
        const response = await nango.post({
            endpoint: `/v2/webhooks/${encodeURIComponent(input.id)}/test`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from test webhook endpoint.'
            });
        }

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
