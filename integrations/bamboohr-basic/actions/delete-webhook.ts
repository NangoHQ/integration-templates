import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    webhookId: z.number().int().describe('The ID of the webhook to delete. Example: 123')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a webhook subscription in BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhooks.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://documentation.bamboohr.com/reference/delete-webhook
        await nango.delete({
            endpoint: `/v1/webhooks/${encodeURIComponent(input.webhookId)}`,
            retries: 10
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
