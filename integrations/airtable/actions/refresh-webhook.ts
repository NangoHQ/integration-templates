import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the base containing the webhook. Example: "appXXXXXXXXXXXXXX"'),
    webhookId: z.string().describe('The ID of the webhook to refresh. Example: "achXXXXXXXXXXXXXX"')
});

const ProviderRefreshWebhookResponseSchema = z.object({
    expirationTime: z.string().optional()
});

const OutputSchema = z.object({
    expirationTime: z.string().optional()
});

const action = createAction({
    description: 'Refresh an Airtable webhook expiration before it expires.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/refresh-webhook',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhook:manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://airtable.com/developers/web/api/refresh-a-webhook
            endpoint: `/v0/bases/${input.baseId}/webhooks/${input.webhookId}/refresh`,
            retries: 3
        });

        const providerResponse = ProviderRefreshWebhookResponseSchema.parse(response.data);

        return {
            ...(providerResponse.expirationTime !== undefined && { expirationTime: providerResponse.expirationTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
