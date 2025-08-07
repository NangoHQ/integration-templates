import { createAction } from 'nango';
import type { AirtableWebhookCreatedResponse } from '../types.js';
import { createWebhookSchema } from '../schema.zod.js';

import type { ProxyConfiguration } from 'nango';
import { WebhookCreated, CreateWebhook } from '../models.js';
import { z } from 'zod';

const action = createAction({
    description: 'Create a webhook for a particular base',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/webhooks',
        group: 'Webhooks'
    },

    input: CreateWebhook,
    output: WebhookCreated,
    scopes: ['webhook:manage'],
    metadata: z.object({ webhooks: z.record(z.string(), z.any()) }),

    exec: async (nango, input): Promise<WebhookCreated> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: createWebhookSchema, input });

        const { baseId, specification } = parsedInput.data;
        const webhookUrl = await nango.getWebhookURL();

        const config: ProxyConfiguration = {
            // https://airtable.com/developers/web/api/create-a-webhook
            endpoint: `/v0/bases/${baseId}/webhooks`,
            data: {
                notificationUrl: webhookUrl,
                specification
            },
            retries: 3
        };

        const response = await nango.post<AirtableWebhookCreatedResponse>(config);

        const { data } = response;

        const { expirationTime, id, macSecretBase64 } = data;

        const metadata = await nango.getMetadata();

        if (metadata?.['webhooks']) {
            await nango.updateMetadata({
                webhooks: {
                    ...metadata['webhooks'],
                    [id]: macSecretBase64
                }
            });
        } else {
            await nango.updateMetadata({
                webhooks: {
                    [id]: macSecretBase64
                }
            });
        }

        return {
            id,
            expirationTime
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
