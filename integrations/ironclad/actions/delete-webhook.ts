import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    webhookId: z.string().describe('The ID of the webhook to delete. Example: "6a6b346ef69937b9258f29ad"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a webhook',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.webhooks.deleteWebhooks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.ironcladapp.com/
        await nango.delete({
            endpoint: `/public/api/v1/webhooks/${encodeURIComponent(input.webhookId)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
