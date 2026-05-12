import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    event_uuid: z.string().describe('The UUID of the scheduled event. Example: "AAAAAAAAAAAAAAAA"'),
    invitee_uuid: z.string().describe('The UUID of the invitee. Example: "BBBBBBBBBBBBBBBB"')
});

const QuestionAndAnswerSchema = z.object({
    answer: z.string(),
    position: z.number(),
    question: z.string()
});

const ProviderTrackingSchema = z.object({
    utm_campaign: z.string().nullable(),
    utm_source: z.string().nullable(),
    utm_medium: z.string().nullable(),
    utm_content: z.string().nullable(),
    utm_term: z.string().nullable(),
    salesforce_uuid: z.string().nullable()
});

const OutputTrackingSchema = z.object({
    utm_campaign: z.string().optional(),
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_content: z.string().optional(),
    utm_term: z.string().optional(),
    salesforce_uuid: z.string().optional()
});

const ProviderEventCancellationSchema = z.object({
    canceled_by: z.string(),
    reason: z.string().nullable(),
    canceler_type: z.string(),
    created_at: z.string()
});

const OutputEventCancellationSchema = z.object({
    canceled_by: z.string(),
    reason: z.string().optional(),
    canceler_type: z.string(),
    created_at: z.string()
});

const PaymentSchema = z.object({
    external_id: z.string(),
    provider: z.string(),
    amount: z.number(),
    currency: z.string(),
    terms: z.string(),
    successful: z.boolean()
});

const ReconfirmationSchema = z.object({
    created_at: z.string(),
    confirmed_at: z.string()
});

const ProviderInviteeSchema = z.object({
    cancel_url: z.string(),
    created_at: z.string(),
    email: z.string(),
    event: z.string(),
    name: z.string(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    new_invitee: z.string().nullable(),
    old_invitee: z.string().nullable(),
    questions_and_answers: QuestionAndAnswerSchema.array(),
    reschedule_url: z.string(),
    rescheduled: z.boolean(),
    status: z.string(),
    text_reminder_number: z.string().nullable(),
    timezone: z.string(),
    tracking: ProviderTrackingSchema,
    updated_at: z.string(),
    uri: z.string(),
    cancellation: ProviderEventCancellationSchema.nullable(),
    routing_form_submission: z.string().nullable(),
    payment: PaymentSchema.nullable(),
    no_show: z.string().nullable(),
    reconfirmation: ReconfirmationSchema.nullable(),
    scheduling_method: z.string().nullable(),
    invitee_scheduled_by: z.string().nullable()
});

const OutputSchema = z.object({
    cancel_url: z.string(),
    created_at: z.string(),
    email: z.string(),
    event: z.string(),
    name: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    new_invitee: z.string().optional(),
    old_invitee: z.string().optional(),
    questions_and_answers: QuestionAndAnswerSchema.array(),
    reschedule_url: z.string(),
    rescheduled: z.boolean(),
    status: z.string(),
    text_reminder_number: z.string().optional(),
    timezone: z.string(),
    tracking: OutputTrackingSchema,
    updated_at: z.string(),
    uri: z.string(),
    cancellation: OutputEventCancellationSchema.optional(),
    routing_form_submission: z.string().optional(),
    payment: PaymentSchema.optional(),
    no_show: z.string().optional(),
    reconfirmation: ReconfirmationSchema.optional(),
    scheduling_method: z.string().optional(),
    invitee_scheduled_by: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single event invitee from Calendly.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-event-invitee',
        group: 'Events'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.calendly.com/api-docs/8305c0ccfac70-get-event-invitee
            endpoint: `/scheduled_events/${input.event_uuid}/invitees/${input.invitee_uuid}`,
            retries: 3
        });

        const providerResponse = z
            .object({
                resource: ProviderInviteeSchema
            })
            .parse(response.data);

        const invitee = providerResponse.resource;

        return {
            cancel_url: invitee.cancel_url,
            created_at: invitee.created_at,
            email: invitee.email,
            event: invitee.event,
            name: invitee.name,
            ...(invitee.first_name != null && { first_name: invitee.first_name }),
            ...(invitee.last_name != null && { last_name: invitee.last_name }),
            ...(invitee.new_invitee != null && { new_invitee: invitee.new_invitee }),
            ...(invitee.old_invitee != null && { old_invitee: invitee.old_invitee }),
            questions_and_answers: invitee.questions_and_answers,
            reschedule_url: invitee.reschedule_url,
            rescheduled: invitee.rescheduled,
            status: invitee.status,
            ...(invitee.text_reminder_number != null && { text_reminder_number: invitee.text_reminder_number }),
            timezone: invitee.timezone,
            tracking: {
                ...(invitee.tracking.utm_campaign != null && { utm_campaign: invitee.tracking.utm_campaign }),
                ...(invitee.tracking.utm_source != null && { utm_source: invitee.tracking.utm_source }),
                ...(invitee.tracking.utm_medium != null && { utm_medium: invitee.tracking.utm_medium }),
                ...(invitee.tracking.utm_content != null && { utm_content: invitee.tracking.utm_content }),
                ...(invitee.tracking.utm_term != null && { utm_term: invitee.tracking.utm_term }),
                ...(invitee.tracking.salesforce_uuid != null && { salesforce_uuid: invitee.tracking.salesforce_uuid })
            },
            updated_at: invitee.updated_at,
            uri: invitee.uri,
            ...(invitee.cancellation != null && {
                cancellation: {
                    canceled_by: invitee.cancellation.canceled_by,
                    ...(invitee.cancellation.reason != null && { reason: invitee.cancellation.reason }),
                    canceler_type: invitee.cancellation.canceler_type,
                    created_at: invitee.cancellation.created_at
                }
            }),
            ...(invitee.routing_form_submission != null && { routing_form_submission: invitee.routing_form_submission }),
            ...(invitee.payment != null && { payment: invitee.payment }),
            ...(invitee.no_show != null && { no_show: invitee.no_show }),
            ...(invitee.reconfirmation != null && { reconfirmation: invitee.reconfirmation }),
            ...(invitee.scheduling_method != null && { scheduling_method: invitee.scheduling_method }),
            ...(invitee.invitee_scheduled_by != null && { invitee_scheduled_by: invitee.invitee_scheduled_by })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;