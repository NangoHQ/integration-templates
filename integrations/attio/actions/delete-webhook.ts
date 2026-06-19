import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    webhook_id: z.string().describe('The unique identifier of the webhook to delete. Example: "45662666-3a96-4189-9ddb-6d6fe20bd076"')
});

const OutputSchema = z.object({
    webhook_id: z.string().describe('The ID of the deleted webhook'),
    deleted: z.boolean().describe('Whether the webhook was successfully deleted')
});

const action = createAction({
    description: 'Delete or archive a webhook in Attio',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhook:read-write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.attio.com/reference/delete_webhooks_webhook_id
        await nango.delete({
            endpoint: `/v2/webhooks/${input.webhook_id}`,
            retries: 3
        });

        return {
            webhook_id: input.webhook_id,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
