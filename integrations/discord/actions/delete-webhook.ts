import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    webhookId: z.string().describe('The ID of the webhook to delete. Example: "223704706495545344"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the webhook was successfully deleted'),
    webhookId: z.string().describe('The ID of the deleted webhook')
});

const action = createAction({
    description: 'Delete a webhook in Discord permanently',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-webhook',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['manage_webhooks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ botToken?: string }>();
        const botToken = metadata?.botToken;

        if (!botToken) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'botToken is required in metadata. Please ensure the Discord connection has a botToken configured.'
            });
        }

        // https://discord.com/developers/docs/resources/webhook#delete-webhook
        const response = await nango.delete({
            endpoint: `/api/v10/webhooks/${input.webhookId}`,
            headers: {
                Authorization: `Bot ${botToken}`
            },
            retries: 3
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Failed to delete webhook',
                webhookId: input.webhookId,
                status: response.status
            });
        }

        return {
            success: true,
            webhookId: input.webhookId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
