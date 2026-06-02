import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    webhook_id: z.string().describe('The ID of the webhook to delete. Example: "12345"')
});

const WebhookV2EventSchema = z.enum(['PING', 'FILE_UPDATE', 'FILE_VERSION_UPDATE', 'FILE_DELETE', 'LIBRARY_PUBLISH', 'FILE_COMMENT', 'DEV_MODE_STATUS_UPDATE']);

const WebhookV2StatusSchema = z.enum(['ACTIVE', 'PAUSED']);

const ProviderWebhookSchema = z.object({
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

const OutputSchema = z.object({
    id: z.string(),
    event_type: z.string().optional(),
    context: z.string().optional(),
    context_id: z.string().optional(),
    status: z.string().optional(),
    endpoint: z.string().optional(),
    description: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive a webhook in Figma.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-webhook',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhooks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch Convert known provider HTTP errors into structured ActionErrors.
        try {
            const response = await nango.delete({
                // https://developers.figma.com/docs/rest-api/webhooks-endpoints/
                endpoint: `/v2/webhooks/${encodeURIComponent(input.webhook_id)}`,
                retries: 10
            });

            const providerWebhook = ProviderWebhookSchema.parse(response.data);

            return {
                id: providerWebhook.id,
                ...(providerWebhook.event_type !== undefined && { event_type: providerWebhook.event_type }),
                ...(providerWebhook.context !== undefined && { context: providerWebhook.context }),
                ...(providerWebhook.context_id !== undefined && { context_id: providerWebhook.context_id }),
                ...(providerWebhook.status !== undefined && { status: providerWebhook.status }),
                ...(providerWebhook.endpoint !== undefined && { endpoint: providerWebhook.endpoint }),
                ...(providerWebhook.description != null && { description: providerWebhook.description })
            };
        } catch (error) {
            const errorWithStatus = z.object({ status: z.number() }).safeParse(error);
            const status = errorWithStatus.success ? errorWithStatus.data.status : undefined;

            if (status === 403) {
                throw new nango.ActionError({
                    type: 'forbidden',
                    message: 'Permission denied. This endpoint requires a Figma Professional plan.'
                });
            }

            if (status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Webhook not found or you do not have permission to access it.'
                });
            }

            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
