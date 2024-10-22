import type { NangoAction, ProxyConfiguration, DeleteWebhook, SuccessResponse } from '../../models';
import { deleteWebhookSchema } from '../schema.zod.js';

interface WebhookMetadata {
    webhooks: Record<string, string>;
}

export default async function runAction(nango: NangoAction, input: DeleteWebhook): Promise<SuccessResponse> {
    const parsedInput = deleteWebhookSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to delete a webhook: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid input provided to delete a webhook'
        });
    }

    const config: ProxyConfiguration = {
        // https://airtable.com/developers/web/api/delete-a-webhook
        endpoint: `/v0/bases/${input.baseId}/webhooks/${input.webhookId}`,
        retries: 10
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
