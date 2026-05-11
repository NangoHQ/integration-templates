import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('Base ID. Example: "appXXXXXXXXXXXXXX"'),
    webhookId: z.string().describe('Webhook ID. Example: "achXXXXXXXXXXXXXX"'),
    enable: z.boolean().describe('Whether to enable or disable notifications for the webhook.')
});

const ProviderWebhookSchema = z.object({
    id: z.string(),
    areNotificationsEnabled: z.boolean().optional(),
    isHookEnabled: z.boolean().optional(),
    notificationUrl: z.string().optional(),
    cursorForNextPayload: z.number().optional(),
    expirationTime: z.string().optional(),
    lastNotificationResult: z.string().nullable().optional(),
    lastSuccessfulNotificationTime: z.string().nullable().optional(),
    specification: z.unknown().optional()
});

const ProviderListResponseSchema = z.object({
    webhooks: z.array(ProviderWebhookSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    areNotificationsEnabled: z.boolean().optional(),
    isHookEnabled: z.boolean().optional(),
    notificationUrl: z.string().optional(),
    cursorForNextPayload: z.number().optional(),
    expirationTime: z.string().optional()
});

const action = createAction({
    description: 'Enable or disable notifications for an Airtable webhook.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/set-webhook-notifications',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhook:manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.post({
            // https://airtable.com/developers/web/api/enable-disable-webhook-notifications
            endpoint: `/v0/bases/${input.baseId}/webhooks/${input.webhookId}/enableNotifications`,
            data: {
                enable: input.enable
            },
            retries: 1
        });

        const response = await nango.get({
            // https://airtable.com/developers/web/api/list-webhooks
            endpoint: `/v0/bases/${input.baseId}/webhooks`,
            retries: 3
        });

        const providerData = ProviderListResponseSchema.parse(response.data);
        const webhook = providerData.webhooks.find((w) => w.id === input.webhookId);

        if (!webhook) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Webhook not found after updating notifications.',
                webhookId: input.webhookId,
                baseId: input.baseId
            });
        }

        return {
            id: webhook.id,
            ...(webhook.areNotificationsEnabled !== undefined && { areNotificationsEnabled: webhook.areNotificationsEnabled }),
            ...(webhook.isHookEnabled !== undefined && { isHookEnabled: webhook.isHookEnabled }),
            ...(webhook.notificationUrl !== undefined && { notificationUrl: webhook.notificationUrl }),
            ...(webhook.cursorForNextPayload !== undefined && { cursorForNextPayload: webhook.cursorForNextPayload }),
            ...(webhook.expirationTime !== undefined && { expirationTime: webhook.expirationTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
