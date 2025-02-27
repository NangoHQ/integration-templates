import type { NangoAction, ProxyConfiguration, DeleteWebhook, SuccessResponse } from '../../models';
import { deleteWebhookSchema } from '../schema.zod.js';

interface WebhookMetadata {
    webhooks: Record<string, string>;
}

export default async function runAction(nango: NangoAction, input: DeleteWebhook): Promise<SuccessResponse> {
    nango.zodValidate({ zodSchema: deleteWebhookSchema, input });

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
