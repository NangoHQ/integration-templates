import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the Airtable base. Example: "app00000000000000"')
});

const WebhookSchema = z.object({
    id: z.string(),
    areNotificationsEnabled: z.boolean(),
    cursorForNextPayload: z.number(),
    isHookEnabled: z.boolean(),
    lastSuccessfulNotificationTime: z.string().nullable().optional(),
    notificationUrl: z.string().nullable().optional(),
    lastNotificationResult: z.record(z.string(), z.unknown()).nullable().optional(),
    expirationTime: z.string().nullable().optional(),
    specification: z.record(z.string(), z.unknown())
});

const OutputSchema = z.object({
    webhooks: z.array(WebhookSchema)
});

const action = createAction({
    description: 'List webhooks configured on an Airtable base',
    version: '2.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-webhooks',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhook:manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/list-webhooks
        const response = await nango.get({
            endpoint: `/v0/bases/${input.baseId}/webhooks`,
            retries: 3
        });

        const providerData = z
            .object({
                webhooks: z.array(z.record(z.string(), z.unknown()))
            })
            .parse(response.data);

        const webhooks = providerData.webhooks.map((item) => {
            return WebhookSchema.parse(item);
        });

        return {
            webhooks
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
