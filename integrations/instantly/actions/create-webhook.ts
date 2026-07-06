import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().optional().describe('Optional user-defined name for the webhook. Example: "Zapier Positive Replies"'),
    target_hook_url: z.string().describe('Target URL to send webhook payloads. Must start with http:// or https://. Example: https://webhook.site/unique-url'),
    event_type: z
        .string()
        .optional()
        .describe(
            'Type of event to trigger the webhook. Valid values: all_events, email_sent, email_bounced, email_opened, email_link_clicked, reply_received, lead_unsubscribed, campaign_completed, account_error, lead_neutral, lead_interested, lead_not_interested, lead_meeting_booked, lead_meeting_completed, lead_closed, lead_out_of_office, lead_wrong_person, lead_no_show, supersearch_enrichment_completed, custom_label_any_positive, custom_label_any_negative. Example: email_sent'
        ),
    campaign: z
        .string()
        .optional()
        .describe('Optional campaign UUID to filter events (omit for all campaigns in workspace). Example: 019f1a5b-d114-7571-a55f-e0326358730b'),
    custom_interest_value: z
        .number()
        .nullable()
        .optional()
        .describe('Custom interest value - corresponds to LeadLabel.interest_status (used for custom label events). Example: 1'),
    headers: z
        .record(z.string(), z.string())
        .nullable()
        .optional()
        .describe(
            'Optional HTTP headers to include when delivering webhook payloads (key-value pairs). Example: { Authorization: "Basic dXNlcm5hbWU6cGFzc3dvcmQ=" }'
        )
});

const ProviderWebhookSchema = z.object({
    id: z.string(),
    organization: z.string(),
    target_hook_url: z.string(),
    timestamp_created: z.string(),
    campaign: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    event_type: z.string().nullable().optional(),
    custom_interest_value: z.number().nullable().optional(),
    headers: z.record(z.string(), z.string()).nullable().optional(),
    status: z.number().nullable().optional(),
    timestamp_error: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('Unique identifier for the webhook (UUID). Example: 019f1a5b-d114-7571-a55f-e03043a03717'),
    organization: z.string().describe('Organization (workspace) UUID that owns this webhook. Example: 019f1a5b-d114-7571-a55f-e03178d1c488'),
    target_hook_url: z.string().describe('Target URL to send webhook payloads. Example: https://webhook.site/unique-url'),
    timestamp_created: z.string().describe('Timestamp when the webhook was created. Example: 2026-06-30T21:07:32.756Z'),
    campaign: z.string().optional().describe('Optional campaign UUID to filter events. Example: 019f1a5b-d114-7571-a55f-e0326358730b'),
    name: z.string().optional().describe('Optional user-defined name for the webhook. Example: Zapier Positive Replies'),
    event_type: z.string().optional().describe('Type of event to trigger the webhook. Example: email_sent'),
    custom_interest_value: z.number().optional().describe('Custom interest value - corresponds to LeadLabel.interest_status. Example: 1'),
    headers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Optional HTTP headers to include when delivering webhook payloads. Example: { Authorization: "Basic dXNlcm5hbWU6cGFzc3dvcmQ=" }'),
    status: z.number().optional().describe('Webhook status: 1 = active, -1 = error (disabled due to delivery failures). Example: 1'),
    timestamp_error: z
        .string()
        .optional()
        .describe('Timestamp when webhook was disabled due to delivery failures (omitted if active). Example: 2026-06-30T21:07:32.756Z')
});

const action = createAction({
    description: 'Create a webhook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhooks:create', 'webhooks:all', 'all:create', 'all:all'],
    endpoint: {
        path: '/actions/create-webhook',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/webhook/create-webhook
            endpoint: '/v2/webhooks',
            data: {
                target_hook_url: input.target_hook_url,
                ...(input.name !== undefined && { name: input.name }),
                ...(input.event_type !== undefined && { event_type: input.event_type }),
                ...(input.campaign !== undefined && { campaign: input.campaign }),
                ...(input.custom_interest_value !== undefined && { custom_interest_value: input.custom_interest_value }),
                ...(input.headers !== undefined && { headers: input.headers })
            },
            retries: 1
        });

        const providerWebhook = ProviderWebhookSchema.parse(response.data);

        return {
            id: providerWebhook.id,
            organization: providerWebhook.organization,
            target_hook_url: providerWebhook.target_hook_url,
            timestamp_created: providerWebhook.timestamp_created,
            ...(providerWebhook.campaign != null && { campaign: providerWebhook.campaign }),
            ...(providerWebhook.name != null && { name: providerWebhook.name }),
            ...(providerWebhook.event_type != null && { event_type: providerWebhook.event_type }),
            ...(providerWebhook.custom_interest_value != null && { custom_interest_value: providerWebhook.custom_interest_value }),
            ...(providerWebhook.headers != null && { headers: providerWebhook.headers }),
            ...(providerWebhook.status != null && { status: providerWebhook.status }),
            ...(providerWebhook.timestamp_error != null && { timestamp_error: providerWebhook.timestamp_error })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
