import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    event_model: z.enum(['deal', 'person', 'company']).describe('The model to subscribe to. Example: "deal"'),
    event_action: z.enum(['create', 'update', 'destroy']).describe('The event to subscribe to. Example: "create"'),
    url: z.string().describe('The URL the webhook will be posted to. Example: "https://my.app.com/webhook"'),
    failure_email: z.string().optional().describe('Email address to notify when the webhook fails. Example: "admin@example.com"')
});

const WebhookSchema = z.object({
    id: z.number(),
    event_model: z.string(),
    event_action: z.string(),
    name: z.string().optional(),
    is_activated: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    account_id: z.number().optional(),
    description: z.string().optional(),
    last_run_at: z.string().nullable().optional(),
    updated_by: z.string().nullable().optional(),
    debug_enabled: z.boolean().optional(),
    app_id: z.number().optional(),
    event_column: z.string().nullable().optional(),
    event_column_delta: z.string().nullable().optional(),
    event_trigger_time: z.string().nullable().optional(),
    automation_folder_id: z.number().nullable().optional(),
    source: z.string().optional(),
    position: z.number().optional(),
    url: z.string().optional(),
    failure_email: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    event_model: z.string(),
    event_action: z.string(),
    name: z.string().optional(),
    is_activated: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    account_id: z.number().optional(),
    description: z.string().optional(),
    last_run_at: z.string().nullable().optional(),
    updated_by: z.string().nullable().optional(),
    debug_enabled: z.boolean().optional(),
    app_id: z.number().optional(),
    event_column: z.string().nullable().optional(),
    event_column_delta: z.string().nullable().optional(),
    event_trigger_time: z.string().nullable().optional(),
    automation_folder_id: z.number().nullable().optional(),
    source: z.string().optional(),
    position: z.number().optional(),
    url: z.string().optional(),
    failure_email: z.string().optional()
});

const action = createAction({
    description: 'Subscribe a URL to a webhook event (event_model + event_action combination).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://app.pipelinecrm.com/openapi.yaml
            endpoint: 'api/v3/admin/webhooks',
            data: {
                webhook: {
                    event_model: input.event_model,
                    event_action: input.event_action,
                    url: input.url,
                    ...(input.failure_email !== undefined && { failure_email: input.failure_email })
                }
            },
            retries: 10
        });

        const webhook = WebhookSchema.parse(response.data);

        return {
            id: webhook.id,
            event_model: webhook.event_model,
            event_action: webhook.event_action,
            ...(webhook.name != null && { name: webhook.name }),
            ...(webhook.is_activated != null && { is_activated: webhook.is_activated }),
            ...(webhook.created_at != null && { created_at: webhook.created_at }),
            ...(webhook.updated_at != null && { updated_at: webhook.updated_at }),
            ...(webhook.account_id != null && { account_id: webhook.account_id }),
            ...(webhook.description != null && { description: webhook.description }),
            ...(webhook.last_run_at != null && { last_run_at: webhook.last_run_at }),
            ...(webhook.updated_by != null && { updated_by: webhook.updated_by }),
            ...(webhook.debug_enabled != null && { debug_enabled: webhook.debug_enabled }),
            ...(webhook.app_id != null && { app_id: webhook.app_id }),
            ...(webhook.event_column != null && { event_column: webhook.event_column }),
            ...(webhook.event_column_delta != null && { event_column_delta: webhook.event_column_delta }),
            ...(webhook.event_trigger_time != null && { event_trigger_time: webhook.event_trigger_time }),
            ...(webhook.automation_folder_id != null && { automation_folder_id: webhook.automation_folder_id }),
            ...(webhook.source != null && { source: webhook.source }),
            ...(webhook.position != null && { position: webhook.position }),
            ...(webhook.url != null && { url: webhook.url }),
            ...(webhook.failure_email != null && { failure_email: webhook.failure_email })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
