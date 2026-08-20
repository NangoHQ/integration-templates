import { z } from 'zod';
import { createAction } from 'nango';

const WebhookTrigger = z.enum([
    'BOOKING_CREATED',
    'BOOKING_PAYMENT_INITIATED',
    'BOOKING_PAID',
    'BOOKING_RESCHEDULED',
    'BOOKING_REQUESTED',
    'BOOKING_CANCELLED',
    'BOOKING_REJECTED',
    'BOOKING_NO_SHOW_UPDATED',
    'BOOKING_LOCATION_UPDATED',
    'BOOKING_REASSIGNED',
    'FORM_SUBMITTED',
    'MEETING_ENDED',
    'MEETING_STARTED',
    'RECORDING_READY',
    'INSTANT_MEETING',
    'INSTANT_MEETING_ACCEPTED',
    'RECORDING_TRANSCRIPTION_GENERATED',
    'OOO_CREATED',
    'AFTER_HOSTS_CAL_VIDEO_NO_SHOW',
    'AFTER_GUESTS_CAL_VIDEO_NO_SHOW',
    'FORM_SUBMITTED_NO_EVENT',
    'ROUTING_FORM_FALLBACK_HIT',
    'DELEGATION_CREDENTIAL_ERROR',
    'WRONG_ASSIGNMENT_REPORT',
    'DELEGATION_CREDENTIAL_SECRET_ROTATION_FAILED',
    'DELEGATION_CREDENTIAL_ROTATION_REQUIRED',
    'DELEGATION_CREDENTIAL_SECRET_ROTATED',
    'CALENDAR_ENTRY_REJECTED'
]);

const InputSchema = z
    .object({
        cursor: z.number().int().min(0).optional().describe('Pagination offset (skip value). Omit for the first page.'),
        take: z.number().int().min(1).max(250).optional().describe('Maximum number of webhooks to return per page. Defaults to 250.')
    })
    .describe('Input for listing Cal.com webhooks.');

const ProviderWebhookSchema = z.object({
    id: z.string(),
    userId: z.number(),
    subscriberUrl: z.string(),
    active: z.boolean(),
    triggers: z.array(WebhookTrigger),
    payloadTemplate: z.string().nullable(),
    version: z.string().nullable().optional(),
    time: z.number().nullable(),
    timeUnit: z.string().nullable(),
    secret: z.string().nullable()
});

const WebhookSchema = z.object({
    id: z.string().describe('Webhook ID.'),
    userId: z.number().describe('User ID that owns the webhook.'),
    subscriberUrl: z.string().describe('URL that receives webhook events.'),
    active: z.boolean().describe('Whether the webhook is currently active.'),
    triggers: z.array(z.string()).describe('Event triggers that fire this webhook.'),
    payloadTemplate: z.string().optional().describe('JSON payload template sent to the subscriber URL.'),
    version: z.string().optional().describe('Payload format version of the webhook.'),
    time: z.number().optional().describe('How long after the booking start time the no-show triggers are evaluated.'),
    timeUnit: z.string().optional().describe('Unit of the no-show time value.'),
    secret: z.string().optional().describe('Secret used to verify webhook signatures.')
});

const OutputSchema = z
    .object({
        items: z.array(WebhookSchema).describe('List of webhooks.'),
        nextCursor: z.number().optional().describe('Offset for the next page. Omitted when there are no more pages.')
    })
    .describe('Output for listing Cal.com webhooks.');

/**
 * @tags: [read]
 * @tagReason: Reads the authenticated user's webhooks from Cal.com.
 * @pitfalls: The provider returns null for several documented-required fields (payloadTemplate, time, timeUnit, and secret) and returns webhook IDs as strings rather than numbers.
 */
const action = createAction({
    description: 'List webhooks from Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['WEBHOOK_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const take = input.take ?? 250;
        const skip = input.cursor ?? 0;

        const config = {
            endpoint: '/webhooks',
            params: {
                take: String(take),
                skip: String(skip)
            },
            retries: 3
        };

        let response;
        // @allowTryCatch: The Nango SDK throws for non-2xx responses. Convert Cal.com's error
        // envelope into a structured ActionError instead of letting the raw error propagate.
        try {
            // https://cal.com/docs/api-reference/v2/webhooks/get-all-webhooks
            response = await nango.get(config);
        } catch (err: unknown) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status when listing webhooks.',
                details: err instanceof Error ? err.message : String(err)
            });
        }

        const providerResponse = z
            .object({
                status: z.enum(['success', 'error']),
                data: z.array(ProviderWebhookSchema).optional()
            })
            .parse(response.data);

        if (providerResponse.status === 'error') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com returned an error status.'
            });
        }

        const items = (providerResponse.data ?? []).map((webhook) => ({
            id: webhook.id,
            userId: webhook.userId,
            subscriberUrl: webhook.subscriberUrl,
            active: webhook.active,
            triggers: webhook.triggers,
            ...(webhook.payloadTemplate != null && { payloadTemplate: webhook.payloadTemplate }),
            ...(webhook.version != null && { version: webhook.version }),
            ...(webhook.time != null && { time: webhook.time }),
            ...(webhook.timeUnit != null && { timeUnit: webhook.timeUnit }),
            ...(webhook.secret != null && { secret: webhook.secret })
        }));

        const nextCursor = items.length === take ? skip + take : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
