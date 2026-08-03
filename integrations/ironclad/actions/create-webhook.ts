import { z } from 'zod';
import { createAction } from 'nango';

const WebhookEventSchema = z.enum([
    '*',
    'workflow_launched',
    'workflow_updated',
    'workflow_cancelled',
    'workflow_completed',
    'workflow_approval_status_changed',
    'workflow_attribute_updated',
    'workflow_comment_added',
    'workflow_comment_removed',
    'workflow_comment_updated',
    'workflow_comment_reaction_added',
    'workflow_comment_reaction_removed',
    'workflow_counterparty_invite_sent',
    'workflow_counterparty_invite_revoked',
    'workflow_documents_added',
    'workflow_documents_removed',
    'workflow_documents_updated',
    'workflow_documents_renamed',
    'workflow_document_edited',
    'workflow_changed_turn',
    'workflow_paused',
    'workflow_resumed',
    'workflow_signature_packet_cancelled',
    'workflow_signature_packet_document_moved',
    'workflow_signature_packet_fully_signed',
    'workflow_signature_packet_sent',
    'workflow_signature_packet_signatures_collected',
    'workflow_signature_packet_signer_first_viewed',
    'workflow_signature_packet_signer_viewed',
    'workflow_signature_packet_uploaded',
    'workflow_signer_added',
    'workflow_signer_removed',
    'workflow_signer_reassigned',
    'workflow_step_updated',
    'workflow_roles_assigned',
    'record_contract_status_changed',
    'obligation_created',
    'obligation_status_changed',
    'obligation_due_date_changed',
    'obligation_assignee_changed',
    'obligation_updated',
    'obligations_extraction_completed'
]);

const InputSchema = z.object({
    targetURL: z.string().describe('The HTTPS URL to send webhook event payloads to. Example: "https://example.com/webhooks/ironclad"'),
    events: z.array(WebhookEventSchema).min(1).describe('The event type(s) to trigger the webhook. Use "*" to receive all events.'),
    status: z.enum(['enabled', 'disabled']).optional().describe('The status of the webhook. Defaults to "enabled".')
});

const ProviderWebhookSchema = z.object({
    id: z.string(),
    events: z.array(WebhookEventSchema),
    targetURL: z.string(),
    companyId: z.string(),
    status: z.enum(['enabled', 'disabled', 'disabledBySystem']),
    statusLastUpdatedAt: z.string().optional().nullable(),
    statusLastUpdatedBy: z.string().optional().nullable(),
    consecutiveFailureCount: z.number(),
    firstConsecutiveFailure: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    events: z.array(WebhookEventSchema),
    targetURL: z.string(),
    companyId: z.string(),
    status: z.enum(['enabled', 'disabled', 'disabledBySystem']),
    statusLastUpdatedAt: z.string().optional(),
    statusLastUpdatedBy: z.string().optional(),
    consecutiveFailureCount: z.number(),
    firstConsecutiveFailure: z.string().optional()
});

const action = createAction({
    description: 'Register a webhook subscription for one or more Ironclad event types.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.webhooks.createWebhooks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.ironcladapp.com/reference/create-a-webhook
            endpoint: '/public/api/v1/webhooks',
            data: {
                targetURL: input.targetURL,
                events: input.events,
                ...(input.status !== undefined && { status: input.status })
            },
            retries: 3
        });

        const providerWebhook = ProviderWebhookSchema.parse(response.data);

        return {
            id: providerWebhook.id,
            events: providerWebhook.events,
            targetURL: providerWebhook.targetURL,
            companyId: providerWebhook.companyId,
            status: providerWebhook.status,
            ...(providerWebhook.statusLastUpdatedAt != null && { statusLastUpdatedAt: providerWebhook.statusLastUpdatedAt }),
            ...(providerWebhook.statusLastUpdatedBy != null && { statusLastUpdatedBy: providerWebhook.statusLastUpdatedBy }),
            consecutiveFailureCount: providerWebhook.consecutiveFailureCount,
            ...(providerWebhook.firstConsecutiveFailure != null && { firstConsecutiveFailure: providerWebhook.firstConsecutiveFailure })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
