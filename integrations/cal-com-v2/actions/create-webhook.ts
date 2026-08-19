import { z } from 'zod';
import { createAction } from 'nango';

const TriggerEnum = z.enum([
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

const TimeUnitEnum = z.enum(['DAY', 'HOUR', 'MINUTE']);

const VersionEnum = z.enum(['2021-10-20', '2026-07-27']);

const InputSchema = z
    .object({
        active: z.boolean().describe('Whether the webhook is active.'),
        subscriberUrl: z.string().describe('The URL that will receive webhook payloads.'),
        triggers: z.array(TriggerEnum).describe('The events that will trigger this webhook.'),
        payloadTemplate: z.string().optional().describe('Custom payload template sent to the subscriber URL.'),
        secret: z.string().optional().describe('Secret used to sign webhook payloads.'),
        version: VersionEnum.optional().describe('Payload format version.'),
        time: z.number().min(1).optional().describe('No-show evaluation delay after the booking start time. Required with timeUnit for no-show triggers.'),
        timeUnit: TimeUnitEnum.optional().describe('Unit for the no-show time value. Required with time for no-show triggers.')
    })
    .describe('Input to create a Cal.com webhook.');

const ProviderWebhookSchema = z.object({
    id: z.string(),
    userId: z.number(),
    subscriberUrl: z.string(),
    active: z.boolean(),
    triggers: z.array(TriggerEnum),
    payloadTemplate: z.string().nullable().optional(),
    version: VersionEnum.nullable().optional(),
    secret: z.string().nullable().optional(),
    time: z.number().nullable().optional(),
    timeUnit: TimeUnitEnum.nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The webhook ID.'),
        userId: z.number().describe('The user ID that owns the webhook.'),
        subscriberUrl: z.string().describe('The URL that receives webhook payloads.'),
        active: z.boolean().describe('Whether the webhook is active.'),
        triggers: z.array(TriggerEnum).describe('The events that trigger this webhook.'),
        payloadTemplate: z.string().optional().describe('The payload template sent to the subscriber URL.'),
        version: VersionEnum.optional().describe('The payload format version.'),
        secret: z.string().optional().describe('The secret used to sign webhook payloads.'),
        time: z.number().optional().describe('The no-show evaluation delay after the booking start time.'),
        timeUnit: TimeUnitEnum.optional().describe('The unit for the no-show time value.')
    })
    .describe('The created Cal.com webhook.');

/**
 * @tags: [write]
 * @tagReason: Creates a new webhook subscription on the provider.
 * @pitfalls: Duplicate subscriber URLs are rejected with a 409 conflict instead of updating the existing webhook, and time and timeUnit are both required for no-show triggers.
 */
const action = createAction({
    description: 'Create a webhook in Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['WEBHOOK_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://cal.com/docs/api-reference/v2/webhooks/create-a-webhook
        const response = await nango.post({
            endpoint: '/webhooks',
            data: {
                active: input.active,
                subscriberUrl: input.subscriberUrl,
                triggers: input.triggers,
                ...(input.payloadTemplate !== undefined && { payloadTemplate: input.payloadTemplate }),
                ...(input.secret !== undefined && { secret: input.secret }),
                ...(input.version !== undefined && { version: input.version }),
                ...(input.time !== undefined && { time: input.time }),
                ...(input.timeUnit !== undefined && { timeUnit: input.timeUnit })
            },
            retries: 1
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object' || !('data' in rawData)) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from provider'
            });
        }

        const providerData = ProviderWebhookSchema.parse(rawData.data);

        return {
            id: providerData.id,
            userId: providerData.userId,
            subscriberUrl: providerData.subscriberUrl,
            active: providerData.active,
            triggers: providerData.triggers,
            ...(providerData.payloadTemplate != null && { payloadTemplate: providerData.payloadTemplate }),
            ...(providerData.version != null && { version: providerData.version }),
            ...(providerData.secret != null && { secret: providerData.secret }),
            ...(providerData.time != null && { time: providerData.time }),
            ...(providerData.timeUnit != null && { timeUnit: providerData.timeUnit })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
