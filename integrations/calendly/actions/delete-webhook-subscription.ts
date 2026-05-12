import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    uuid: z.string().describe('The unique identifier of the webhook subscription to delete. Example: "ABCD1234..."')
});

const OutputSchema = z.object({
    uuid: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete or archive a webhook subscription in Calendly.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-webhook-subscription',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhooks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.calendly.com/api-docs/565b97f62dafe-delete-webhook-subscription
        const response = await nango.delete({
            endpoint: `/webhook_subscriptions/${input.uuid}`,
            retries: 3
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete webhook subscription. Received status ${response.status}.`,
                uuid: input.uuid
            });
        }

        return {
            uuid: input.uuid,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;