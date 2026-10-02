import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const EventTypeSchema = z.enum([
    'bounces',
    'hardBounces',
    'softBounces',
    'delivered',
    'spam',
    'requests',
    'opened',
    'clicks',
    'invalid',
    'deferred',
    'blocked',
    'unsubscribed',
    'error',
    'loadedByProxy'
]);

const InputSchema = z
    .object({
        limit: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Maximum number of events to return. Example: 100. Defaults to 2500 on the provider side when omitted.'),
        offset: z.number().int().min(0).optional().describe('Beginning point in the result list to retrieve from (0-based). Defaults to 0.'),
        email: z.string().optional().describe('Filter the report for a specific recipient email address. Example: "john.smith@example.com".'),
        event: EventTypeSchema.optional().describe('Filter the report for a specific event type. Example: "delivered".'),
        templateId: z.number().int().positive().optional().describe('Filter on a specific transactional template ID. Example: 4.'),
        messageId: z.string().optional().describe('Filter on a specific message ID. Example: "<201798300811.5787683@example.domain.com>".'),
        startDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe(
                'Starting date of the report (YYYY-MM-DD). Mandatory if endDate is used and must be lower than or equal to endDate. When no dates are passed, the report covers the past 30 days.'
            ),
        endDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe(
                'Ending date of the report (YYYY-MM-DD). Mandatory if startDate is used and must be greater than or equal to startDate. The date range cannot exceed 90 days.'
            )
    })
    .describe('Filters for the transactional email event log. All fields are optional; with no startDate/endDate the provider returns the past 30 days.');

const ProviderEventSchema = z.object({
    date: z.string(),
    email: z.string(),
    event: EventTypeSchema,
    messageId: z.string(),
    from: z.string().optional(),
    ip: z.string().optional(),
    link: z.string().optional(),
    reason: z.string().optional(),
    subject: z.string().optional(),
    tag: z.string().optional(),
    templateId: z.number().optional()
});

const ProviderResponseSchema = z.object({
    events: z.array(ProviderEventSchema).optional()
});

const EventSchema = z.object({
    date: z.string().describe('UTC date-time on which the event was generated. Example: "2026-09-30T12:30:00Z".'),
    email: z.string().describe('Email address which generated the event.'),
    event: EventTypeSchema.describe('Event which occurred (e.g. requests, delivered, opened, clicks, hardBounces).'),
    messageId: z.string().describe('Message ID which generated the event.'),
    from: z.string().optional().describe('Sender email address from which the email was sent.'),
    ip: z.string().optional().describe('IP from which the recipient opened the email or clicked a link (only present on opened/clicks events).'),
    link: z.string().optional().describe('Link that was sent to the recipient (only present on requests/opened/clicks events).'),
    reason: z.string().optional().describe('Reason of the bounce (only present on hardBounces/softBounces events).'),
    subject: z.string().optional().describe('Subject of the email.'),
    tag: z.string().optional().describe('Tag of the email which generated the event.'),
    templateId: z.number().optional().describe('ID of the transactional template used (only present when the email is template based).')
});

const OutputSchema = z
    .object({
        events: z
            .array(EventSchema)
            .describe('Transactional email events matching the filters, newest first by default. Empty when nothing matches the filters.')
    })
    .describe('The transactional email event log for the account.');

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET of the transactional email event log; it creates, updates, or deletes nothing on the provider.
 * @pitfalls: startDate and endDate must be passed together (YYYY-MM-DD) with startDate <= endDate and the range spanning at most 90 days; when neither date is passed, only events from the past 30 days are returned.
 */
const action = createAction({
    description: 'Retrieve the transactional email event log (requests, delivered, opens, clicks, bounces, etc.) for the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if ((input.startDate === undefined) !== (input.endDate === undefined)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'startDate and endDate must be provided together (YYYY-MM-DD).'
            });
        }
        if (input.startDate !== undefined && input.endDate !== undefined && input.startDate > input.endDate) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'startDate must be lower than or equal to endDate.'
            });
        }

        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/getemaileventreport-1
            endpoint: '/smtp/statistics/events',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.offset !== undefined && { offset: input.offset }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.event !== undefined && { event: input.event }),
                ...(input.templateId !== undefined && { templateId: input.templateId }),
                ...(input.messageId !== undefined && { messageId: input.messageId }),
                ...(input.startDate !== undefined && { startDate: input.startDate }),
                ...(input.endDate !== undefined && { endDate: input.endDate })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ProviderResponseSchema.parse(response.data ?? {});

        return {
            events: parsed.events ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
