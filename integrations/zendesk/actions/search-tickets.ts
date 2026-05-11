import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z
        .string()
        .describe('Zendesk search query. Should include "type:ticket" and any additional filters like status, tags, dates. Example: "type:ticket status:open"'),
    sort_by: z.enum(['updated_at', 'created_at', 'priority', 'status', 'ticket_type']).optional().describe('Sort field. Defaults to relevance.'),
    sort_order: z.enum(['asc', 'desc']).optional().describe('Sort order. Defaults to desc.'),
    page: z.number().int().min(1).optional().describe('Page number for offset pagination.')
});

const TicketSchema = z.object({
    id: z.number(),
    url: z.string(),
    external_id: z.string().nullable().optional(),
    via: z
        .object({
            channel: z.string().optional()
        })
        .passthrough()
        .optional(),
    created_at: z.string(),
    updated_at: z.string(),
    type: z.string().nullable().optional(),
    subject: z.string().nullable().optional(),
    raw_subject: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    priority: z.string().nullable().optional(),
    status: z.string(),
    recipient: z.string().nullable().optional(),
    requester_id: z.number(),
    submitter_id: z.number(),
    assignee_id: z.number().nullable().optional(),
    organization_id: z.number().nullable().optional(),
    group_id: z.number().nullable().optional(),
    collaborator_ids: z.array(z.number()).optional(),
    follower_ids: z.array(z.number()).optional(),
    email_cc_ids: z.array(z.number()).optional(),
    forum_topic_id: z.number().nullable().optional(),
    problem_id: z.number().nullable().optional(),
    has_incidents: z.boolean().optional(),
    is_public: z.boolean().optional(),
    due_at: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    custom_fields: z
        .array(
            z.object({
                id: z.number(),
                value: z.unknown()
            })
        )
        .optional(),
    satisfaction_rating: z
        .object({
            score: z.string()
        })
        .passthrough()
        .nullable()
        .optional(),
    sharing_agreement_ids: z.array(z.number()).optional(),
    fields: z
        .array(
            z.object({
                id: z.number(),
                value: z.unknown()
            })
        )
        .optional(),
    followup_ids: z.array(z.number()).optional(),
    ticket_form_id: z.number().nullable().optional(),
    brand_id: z.number().optional(),
    allow_channelback: z.boolean().optional(),
    allow_attachments: z.boolean().optional(),
    result_type: z.literal('ticket')
});

const SearchResponseSchema = z.object({
    count: z.number(),
    facets: z.unknown().nullable().optional(),
    next_page: z.string().nullable().optional(),
    previous_page: z.string().nullable().optional(),
    results: z.array(z.unknown())
});

const OutputSchema = z.object({
    count: z.number(),
    next_page: z.string().optional(),
    previous_page: z.string().optional(),
    tickets: z.array(TicketSchema.omit({ result_type: true }))
});

const action = createAction({
    description: 'Search tickets with Zendesk search syntax.',
    version: '3.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/search-tickets',
        group: 'Tickets'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:tickets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.zendesk.com/api-reference/ticketing/ticket-management/search/
        const response = await nango.get({
            endpoint: '/api/v2/search.json',
            params: {
                query: input.query,
                ...(input.sort_by !== undefined && { sort_by: input.sort_by }),
                ...(input.sort_order !== undefined && { sort_order: input.sort_order }),
                ...(input.page !== undefined && { page: String(input.page) })
            },
            retries: 3
        });

        const searchData = SearchResponseSchema.parse(response.data);

        // Filter results to only include tickets and validate each one
        const tickets: z.infer<typeof TicketSchema>[] = [];
        for (const result of searchData.results) {
            if (typeof result === 'object' && result !== null && 'result_type' in result && result.result_type === 'ticket') {
                const parsed = TicketSchema.safeParse(result);
                if (parsed.success) {
                    tickets.push(parsed.data);
                }
            }
        }

        return {
            count: searchData.count,
            ...(searchData.next_page !== null && searchData.next_page !== undefined && { next_page: searchData.next_page }),
            ...(searchData.previous_page !== null && searchData.previous_page !== undefined && { previous_page: searchData.previous_page }),
            tickets: tickets.map((ticket) => {
                const { result_type: _resultType, ...ticketWithoutResultType } = ticket;
                return ticketWithoutResultType;
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
