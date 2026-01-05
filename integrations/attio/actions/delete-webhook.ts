import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

/**
 * Deletes a webhook from the Attio workspace.
 * API Docs: https://docs.attio.com/rest-api/endpoint-reference/webhooks/delete-a-webhook
 */

// Input schema
const DeleteWebhookInput = z.object({
    webhook_id: z.string()
});

// Output schema - empty object on success
const DeleteWebhookOutput = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Deletes a webhook from the Attio workspace',
    version: '1.0.0',

    endpoint: {
        method: 'DELETE',
        path: '/webhooks/{webhook_id}',
        group: 'Webhooks'
    },

    input: DeleteWebhookInput,
    output: DeleteWebhookOutput,
    scopes: ['webhook:read-write'],

    exec: async (nango, input): Promise<z.infer<typeof DeleteWebhookOutput>> => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/webhooks/delete-a-webhook
            endpoint: `v2/webhooks/${input.webhook_id}`,
            retries: 3
        };

        await nango.delete(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
