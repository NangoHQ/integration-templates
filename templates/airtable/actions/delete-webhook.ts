import { createAction } from 'nango';
import { deleteWebhookSchema } from '../schema.zod.js';

import type { ProxyConfiguration } from 'nango';
import { SuccessResponse, DeleteWebhook } from '../models.js';
import { z } from 'zod';

interface WebhookMetadata {
    webhooks: Record<string, string>;
}

const action = createAction({
    description: 'Delete a webhook',
    version: '1.0.0',

    endpoint: {
        method: 'DELETE',
        path: '/webhooks',
        group: 'Webhooks'
    },

    input: DeleteWebhook,
    output: SuccessResponse,
    scopes: ['webhook:manage'],
    metadata: z.object({ webhooks: z.object({}) }),

    exec: async (nango, input): Promise<SuccessResponse> => {
        await nango.zodValidateInput({ zodSchema: deleteWebhookSchema, input });

        const config: ProxyConfiguration = {
            // https://airtable.com/developers/web/api/delete-a-webhook
            endpoint: `/v0/bases/${input.baseId}/webhooks/${input.webhookId}`,
            retries: 3
        };

        await nango.delete(config);

        const metadata = await nango.getMetadata<WebhookMetadata>();

        if (metadata?.['webhooks']) {
            const { [input.webhookId]: _, ...rest } = metadata['webhooks'];

            await nango.updateMetadata({
                webhooks: rest
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
