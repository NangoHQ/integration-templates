import { z } from 'zod';
import { createAction } from 'nango';

const WebhookTriggerEnum = z.enum([
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
        id: z.string().describe('The ID of the webhook to update. Example: "123"'),
        payloadTemplate: z.string().optional().describe('The template of the payload sent to the subscriberUrl.'),
        active: z.boolean().optional().describe('Whether the webhook is active.'),
        subscriberUrl: z.string().optional().describe('The URL that receives webhook events.'),
        triggers: z.array(WebhookTriggerEnum).optional().describe('The event triggers to subscribe to.'),
        secret: z.string().optional().describe('Secret used to sign webhook payloads.'),
        version: z.enum(['2021-10-20', '2026-07-27']).optional().describe('Payload format version of the webhook.'),
        time: z.number().optional().describe('No-show evaluation delay after booking start time. Required with timeUnit for no-show triggers.'),
        timeUnit: z.enum(['DAY', 'HOUR', 'MINUTE']).optional().describe('Unit of the no-show time value. Required with time for no-show triggers.')
    })
    .describe('Input to update an existing Cal.com webhook.');

const OutputSchema = z
    .object({
        id: z.string().describe('The webhook ID.'),
        userId: z.number().describe('The user ID that owns the webhook.'),
        subscriberUrl: z.string().describe('The URL that receives webhook events.'),
        payloadTemplate: z.string().optional().describe('The template of the payload sent to the subscriberUrl.'),
        active: z.boolean().describe('Whether the webhook is active.'),
        triggers: z.array(z.string()).describe('The event triggers this webhook is subscribed to.'),
        secret: z.string().optional().describe('Secret used to sign webhook payloads.'),
        version: z.string().optional().describe('Payload format version of the webhook.'),
        time: z.number().optional().describe('No-show evaluation delay after booking start time.'),
        timeUnit: z.string().optional().describe('Unit of the no-show time value.')
    })
    .describe('The updated Cal.com webhook.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing webhook configuration on the provider.
 * @pitfalls: time and timeUnit must both be supplied when subscribing to AFTER_HOSTS_CAL_VIDEO_NO_SHOW or AFTER_GUESTS_CAL_VIDEO_NO_SHOW.
 */
const action = createAction({
    description: 'Update a webhook in Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['WEBHOOK_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: The Nango SDK throws for non-2xx responses. Convert Cal.com's error
        // envelope into a structured ActionError instead of letting the raw error propagate.
        try {
            response = await nango.patch({
                // https://cal.com/docs/api-reference/v2/webhooks/update-a-webhook
                endpoint: `/webhooks/${encodeURIComponent(input.id)}`,
                data: {
                    ...(input.payloadTemplate !== undefined && { payloadTemplate: input.payloadTemplate }),
                    ...(input.active !== undefined && { active: input.active }),
                    ...(input.subscriberUrl !== undefined && { subscriberUrl: input.subscriberUrl }),
                    ...(input.triggers !== undefined && { triggers: input.triggers }),
                    ...(input.secret !== undefined && { secret: input.secret }),
                    ...(input.version !== undefined && { version: input.version }),
                    ...(input.time !== undefined && { time: input.time }),
                    ...(input.timeUnit !== undefined && { timeUnit: input.timeUnit })
                },
                retries: 10
            });
        } catch (err: unknown) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status when updating the webhook.',
                details: err instanceof Error ? err.message : String(err)
            });
        }

        const ProviderResponseSchema = z.object({
            status: z.enum(['success', 'error']),
            data: z.object({
                id: z.string(),
                userId: z.number(),
                subscriberUrl: z.string(),
                payloadTemplate: z.string().nullable(),
                active: z.boolean(),
                triggers: z.array(z.string()),
                secret: z.string().nullable(),
                version: z.string().nullable(),
                time: z.number().nullable(),
                timeUnit: z.string().nullable()
            })
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.status !== 'success') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'The provider returned an error status when updating the webhook.'
            });
        }

        return {
            id: parsed.data.id,
            userId: parsed.data.userId,
            subscriberUrl: parsed.data.subscriberUrl,
            active: parsed.data.active,
            triggers: parsed.data.triggers,
            ...(parsed.data.payloadTemplate != null && { payloadTemplate: parsed.data.payloadTemplate }),
            ...(parsed.data.secret != null && { secret: parsed.data.secret }),
            ...(parsed.data.version != null && { version: parsed.data.version }),
            ...(parsed.data.time != null && { time: parsed.data.time }),
            ...(parsed.data.timeUnit != null && { timeUnit: parsed.data.timeUnit })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
