import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    webhookId: z.string().describe('The UUID webhook_id of the webhook to delete. Example: "13f9cf11-cc5b-4e6d-830c-a858f45cf792"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a webhook subscription in Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/delete-webhook',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.aircall.io/api-references/#delete-a-webhook
        const response = await nango.delete({
            endpoint: `/v1/webhooks/${encodeURIComponent(input.webhookId)}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Webhook not found',
                webhookId: input.webhookId
            });
        }

        if (response.status === 403) {
            throw new nango.ActionError({
                type: 'forbidden',
                message: 'Invalid API credentials or insufficient permissions',
                webhookId: input.webhookId
            });
        }

        return {
            success: response.status === 204
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
