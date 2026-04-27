import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the base containing the webhook. Example: "appXXXXXXXXXXXXXX"'),
    webhookId: z.string().describe('The ID of the webhook to update. Example: "achXXXXXXXXXXXXXX"'),
    enabled: z.boolean().describe('Whether to enable or disable notifications for this webhook.')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the notification setting was successfully updated.')
});

const action = createAction({
    description: 'Enable or disable notifications for an Airtable webhook.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/set-webhook-notifications',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhook:manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/enable-disable-webhook-notifications
        await nango.post({
            endpoint: `/v0/bases/${input.baseId}/webhooks/${input.webhookId}/enableNotifications`,
            data: {
                enable: input.enabled
            },
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
