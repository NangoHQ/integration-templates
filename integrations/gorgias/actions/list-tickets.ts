import { createAction } from 'nango';
import * as z from 'zod';

const InputSchema = z
    .object({
        customer_id: z.number().optional().describe('Filter tickets by the customer ID.'),
        view_id: z.number().optional().describe('Filter tickets by the view ID.'),
        rule_id: z.number().optional().describe('Filter tickets by the rule ID.'),
        ticket_ids: z.array(z.number()).optional().describe('Filter tickets by specific ticket IDs (max 100).'),
        external_id: z.string().optional().describe('Filter tickets by the external ID in a foreign system.'),
        trashed: z.boolean().optional().describe('Whether to include trashed tickets. Defaults to true, so trashed tickets are included by default.'),
        order_by: z.string().optional().describe('Sort order, e.g. `created_datetime:desc` or `updated_datetime:asc`.'),
        limit: z.number().optional().describe('Maximum number of tickets to return per page (max 100).'),
        cursor: z.string().optional().describe('Cursor for pagination to fetch the next page.')
    })
    .describe('Input for listing tickets with optional filters.');

const TicketSchema = z.object({}).passthrough().describe('A ticket object returned by the Gorgias API.');

const MetaSchema = z
    .object({
        prev_cursor: z.string().nullable().optional().describe('Cursor for the previous page, if any.'),
        next_cursor: z.string().nullable().optional().describe('Cursor for the next page, if any.'),
        total_resources: z.number().nullable().optional().describe('Total number of tickets matching the query.')
    })
    .describe('Pagination metadata for the list-tickets response.');

const OutputSchema = z
    .object({
        data: z.array(TicketSchema).describe('List of tickets matching the query.'),
        meta: MetaSchema.describe('Pagination metadata for the result set.')
    })
    .describe('Output of the list-tickets action containing tickets and pagination metadata.');

/**
 * @tags: [read]
 * @tagReason: Lists tickets from the Gorgias API.
 * @pitfalls: total_resources may be null even when tickets are returned.
 */
const action = createAction({
    description: 'List tickets, optionally filtered by customer, view, rule, or specific IDs.',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets:read'],
    exec: async (nango, input) => {
        const params: Record<string, string | number | number[]> = {};

        if (input.customer_id !== undefined) {
            params['customer_id'] = input.customer_id;
        }
        if (input.view_id !== undefined) {
            params['view_id'] = input.view_id;
        }
        if (input.rule_id !== undefined) {
            params['rule_id'] = input.rule_id;
        }
        if (input.ticket_ids !== undefined && input.ticket_ids.length > 0) {
            params['ticket_ids'] = input.ticket_ids;
        }
        if (input.external_id !== undefined) {
            params['external_id'] = input.external_id;
        }
        if (input.trashed !== undefined) {
            params['trashed'] = input.trashed ? 'true' : 'false';
        }
        if (input.order_by !== undefined) {
            params['order_by'] = input.order_by;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.cursor !== undefined) {
            params['cursor'] = input.cursor;
        }

        // https://developers.gorgias.com/reference/list-tickets
        const response = await nango.get({
            endpoint: '/api/tickets',
            params,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export default action;
