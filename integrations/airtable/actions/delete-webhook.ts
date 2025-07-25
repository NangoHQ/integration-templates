import type { NangoAction, ProxyConfiguration, DeleteWebhook, SuccessResponse } from '../../models.js';
import { deleteWebhookSchema } from '../schema.zod.js';

interface WebhookMetadata {
    webhooks: Record<string, string>;
}

export default async function runAction(nango: NangoAction, input: DeleteWebhook): Promise<SuccessResponse> {
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
