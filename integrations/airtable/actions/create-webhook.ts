import type { NangoAction, ProxyConfiguration, CreateWebhook, WebhookCreated } from '../../models';
import type { AirtableWebhookCreatedResponse } from '../types';
import { createWebhookSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: CreateWebhook): Promise<WebhookCreated> {
    const parsedInput = createWebhookSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a webhook: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid input provided to create a webhook'
        });
    }

    const { baseId, specification } = parsedInput.data;
    let webhookUrl = await nango.getWebhookURL();

webhookUrl = 'https://h0xqcc9zj1.sharedwithexpose.com/webhook/f790632d-810e-4cbe-a234-ad656418fc70/airtable';



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
