import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    webhook_id: z.string().describe('The ID of the webhook to update. Example: "123456789"'),
    event_type: z
        .enum(['PING', 'FILE_UPDATE', 'FILE_VERSION_UPDATE', 'FILE_DELETE', 'LIBRARY_PUBLISH', 'FILE_COMMENT', 'DEV_MODE_STATUS_UPDATE'])
        .optional()
        .describe('The type of event that will trigger this webhook to fire.'),
    endpoint: z.string().optional().describe('The HTTP endpoint that will receive a POST request when the event triggers. Max length 2048 characters.'),
    passcode: z
        .string()
        .optional()
        .describe('String that will be passed back to your webhook endpoint to verify that it is being called by Figma. Max length 100 characters.'),
    status: z.enum(['ACTIVE', 'PAUSED']).optional().describe('State to put the webhook in. The webhook cannot be put into an error state this way.'),
    description: z
        .string()
        .optional()
        .describe('User-provided description or name for the webhook. Max length 140 characters. Providing an empty string will delete the description.')
});

const WebhookV2Schema = z.object({
    id: z.string(),
    event_type: z.string(),
    team_id: z.string(),
    context: z.string(),
    context_id: z.string(),
    plan_api_id: z.string(),
    status: z.string(),
    client_id: z.string().nullable(),
    passcode: z.string(),
    endpoint: z.string(),
    description: z.string().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    event_type: z.string(),
    team_id: z.string(),
    context: z.string(),
    context_id: z.string(),
    plan_api_id: z.string(),
    status: z.string(),
    client_id: z.string().optional(),
    passcode: z.string(),
    endpoint: z.string(),
    description: z.string().optional()
});

const action = createAction({
    description: 'Update a webhook in Figma',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-webhook',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhooks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: {
            event_type?: string;
            endpoint?: string;
            passcode?: string;
            status?: string;
            description?: string;
        } = {};

        if (input.event_type !== undefined) {
            data.event_type = input.event_type;
        }
        if (input.endpoint !== undefined) {
            data.endpoint = input.endpoint;
        }
        if (input.passcode !== undefined) {
            data.passcode = input.passcode;
        }
        if (input.status !== undefined) {
            data.status = input.status;
        }
        if (input.description !== undefined) {
            data.description = input.description;
        }

        // https://www.figma.com/developers/api#put-webhooks-endpoint
        const response = await nango.put({
            endpoint: `/v2/webhooks/${encodeURIComponent(input.webhook_id)}`,
            data,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Webhook not found or update failed',
                webhook_id: input.webhook_id
            });
        }

        const providerWebhook = WebhookV2Schema.parse(response.data);

        return {
            id: providerWebhook.id,
            event_type: providerWebhook.event_type,
            team_id: providerWebhook.team_id,
            context: providerWebhook.context,
            context_id: providerWebhook.context_id,
            plan_api_id: providerWebhook.plan_api_id,
            status: providerWebhook.status,
            ...(providerWebhook.client_id != null && { client_id: providerWebhook.client_id }),
            passcode: providerWebhook.passcode,
            endpoint: providerWebhook.endpoint,
            ...(providerWebhook.description != null && { description: providerWebhook.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
