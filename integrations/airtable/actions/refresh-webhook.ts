import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    base_id: z.string().describe('The ID of the base containing the webhook. Example: "appXXXXXXXXXXXXXX"'),
    webhook_id: z.string().describe('The ID of the webhook to refresh. Example: "achXXXXXXXXXXXXXX"')
});

const ProviderResponseSchema = z.object({
    expirationTime: z.string().optional().describe('The new expiration time of the webhook in ISO 8601 format.')
});

const OutputSchema = z.object({
    expiration_time: z.string().optional().describe('The new expiration time of the webhook in ISO 8601 format.')
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
            endpoint: `/v0/bases/${input.base_id}/webhooks/${input.webhook_id}/refresh`,
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerResponse.expirationTime !== undefined && { expiration_time: providerResponse.expirationTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
