import { createAction } from 'nango';
import type { AirtableWebhook, AirtableWebhookResponse } from '../types';

import type { ProxyConfiguration } from 'nango';
import { Webhook, WebhookResponse, BaseId } from '../models.js';

const action = createAction({
    description: 'List all the webhooks available for a base',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/webhooks',
        group: 'Webhooks'
    },

    input: BaseId,
    output: WebhookResponse,
    scopes: ['webhook:manage'],

    exec: async (nango, input): Promise<WebhookResponse> => {
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
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
