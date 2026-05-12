import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    event_uuid: z.string().describe('The unique identifier for the scheduled event. Example: "GBGBDCAADAEDCRZ2"'),
    email: z.string().optional().describe('Filter by invitee email address'),
    status: z.enum(['active', 'canceled']).optional().describe('Filter by invitee status'),
    sort: z.enum(['created_at:asc', 'created_at:desc', 'updated_at:asc', 'updated_at:desc']).optional().describe('Sort order for results'),
    count: z.number().int().min(1).max(100).optional().describe('Number of results per page (1-100)'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const InviteeSchema = z.object({
    uri: z.string().describe('Canonical reference for the invitee'),
    email: z.string().describe('Invitee email address'),
    name: z.string().optional().describe('Invitee display name'),
    status: z.enum(['active', 'canceled']).describe('Status of the invitee'),
    timezone: z.string().optional().describe('Invitee timezone'),
    created_at: z.string().describe('When the invitee was created'),
    updated_at: z.string().describe('When the invitee was last updated'),
    event: z.string().describe('Reference to the scheduled event'),
    questions_and_answers: z
        .array(
            z.object({
                question: z.string(),
                answer: z.string()
            })
        )
        .optional()
        .describe('Answers to custom questions'),
    tracking: z
        .object({
            utm_campaign: z.string().optional(),
            utm_source: z.string().optional(),
            utm_medium: z.string().optional(),
            utm_content: z.string().optional(),
            utm_term: z.string().optional(),
            salesforce_uuid: z.string().optional()
        })
        .optional()
        .describe('UTM tracking parameters'),
    text_reminder_number: z.string().optional().describe('Phone number for text reminders'),
    rescheduled: z.boolean().optional().describe('Whether the invitee rescheduled'),
    old_invitee: z.string().optional().describe('Reference to the previous invitee if rescheduled'),
    new_invitee: z.string().optional().describe('Reference to the new invitee if rescheduled'),
    cancel_url: z.string().optional().describe('URL to cancel the invitee'),
    reschedule_url: z.string().optional().describe('URL to reschedule the invitee')
});

const OutputSchema = z.object({
    items: z.array(InviteeSchema).describe('List of event invitees'),
    next_cursor: z.string().optional().describe('Pagination cursor for the next page of results')
});

const action = createAction({
    description: 'List event invitees from Calendly',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-event-invitees',
        group: 'Event Invitees'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.email) params['email'] = input.email;
        if (input.status) params['status'] = input.status;
        if (input.sort) params['sort'] = input.sort;
        if (input.count) params['count'] = input.count;
        if (input.cursor) params['page_token'] = input.cursor;

        // https://developer.calendly.com/api-docs/eb8ee72701f99-list-event-invitees
        const response = await nango.get({
            endpoint: `/scheduled_events/${input.event_uuid}/invitees`,
            params,
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            collection: z.array(z.object({}).passthrough()),
            pagination: z
                .object({
                    count: z.number().optional(),
                    next_page_token: z.string().optional()
                })
                .optional()
        });

        const parseResult = ProviderResponseSchema.safeParse(response.data);
        if (!parseResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Calendly API'
            });
        }

        const data = parseResult.data;

        const invitees = data.collection.map((item) => {
            const invitee = InviteeSchema.parse(item);
            return invitee;
        });

        return {
            items: invitees,
            ...(data.pagination?.next_page_token && {
                next_cursor: data.pagination.next_page_token
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
