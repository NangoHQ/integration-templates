import type { NangoAction, ProxyConfiguration } from '../../models';
import type { AirtableWebhookCreatedResponse } from '../types';
import { createWebhookSchema } from '../schema.zod.js';
import type { CreateWebhook, WebhookCreated } from '../.nango/schema';

export default async function runAction(nango: NangoAction, input: CreateWebhook): Promise<WebhookCreated> {
    nango.zodValidateInput({ zodSchema: createWebhookSchema, input });

    const { baseId, specification } = input;
    const webhookUrl = await nango.getWebhookURL();

    const config: ProxyConfiguration = {
        // https://airtable.com/developers/web/api/create-a-webhook
        endpoint: `/v0/bases/${baseId}/webhooks`,
        data: {
            notificationUrl: webhookUrl,
            specification
        },
        retries: 10
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
