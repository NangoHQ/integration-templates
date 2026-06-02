import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    webhook_id: z.string().describe('The ID of the webhook to retrieve. Example: "123456789"')
});

const WebhookV2StatusSchema = z.enum(['ACTIVE', 'PAUSED']);

const WebhookV2EventSchema = z.enum(['PING', 'FILE_UPDATE', 'FILE_VERSION_UPDATE', 'FILE_DELETE', 'LIBRARY_PUBLISH', 'FILE_COMMENT', 'DEV_MODE_STATUS_UPDATE']);

const OutputSchema = z.object({
    id: z.string(),
    event_type: WebhookV2EventSchema,
    team_id: z.string(),
    context: z.string(),
    context_id: z.string(),
    plan_api_id: z.string(),
    status: WebhookV2StatusSchema,
    client_id: z.string().nullable(),
    passcode: z.string(),
    endpoint: z.string(),
    description: z.string().nullable()
});

const action = createAction({
    description: 'Retrieve a single webhook from Figma.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-webhook',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhooks:read', 'files:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.figma.com/docs/rest-api/webhooks-endpoints/#get-webhook-by-id
            endpoint: `/v2/webhooks/${encodeURIComponent(input.webhook_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Webhook not found or not accessible',
                webhook_id: input.webhook_id
            });
        }

        const webhook = OutputSchema.parse(response.data);

        return webhook;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
