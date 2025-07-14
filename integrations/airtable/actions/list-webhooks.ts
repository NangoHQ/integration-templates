import type { NangoAction, ProxyConfiguration, BaseId, Webhook, WebhookResponse } from '../../models.js';
import type { AirtableWebhook, AirtableWebhookResponse } from '../types.js';

export default async function runAction(nango: NangoAction, input: BaseId): Promise<WebhookResponse> {
    if (!input.baseId) {
        throw new nango.ActionError({
            message: 'Base ID is required'
        });
    }

    const config: ProxyConfiguration = {
        // https://airtable.com/developers/web/api/list-webhooks
        endpoint: `/v0/bases/${input.baseId}/webhooks`,
        retries: 3
    };

    const response = await nango.get<AirtableWebhookResponse>(config);

    const { data } = response;

    const webhookOutput = data.webhooks.map((aWebhook: AirtableWebhook) => {
        const webhook: Webhook = {
            id: aWebhook.id,
            specification: aWebhook.specification,
            cursorForNextPayload: aWebhook.cursorForNextPayload,
            lastNotificationResult: aWebhook.lastNotificationResult,
            areNotificationsEnabled: aWebhook.areNotificationsEnabled,
            lastSuccessfulNotificationTime: aWebhook.lastSuccessfulNotificationTime,
            isHookEnabled: aWebhook.isHookEnabled,
            expirationTime: aWebhook.expirationTime
        };

        return webhook;
    });

    return { webhooks: webhookOutput };
}
