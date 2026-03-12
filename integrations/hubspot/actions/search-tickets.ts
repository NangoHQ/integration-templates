import { z } from 'zod';
import { createAction } from 'nango';

const FilterOperatorSchema = z.enum([
    'EQ',
    'NEQ',
    'LT',
    'LTE',
    'GT',
    'GTE',
    'BETWEEN',
    'IN',
    'NOT_IN',
    'HAS_PROPERTY',
    'NOT_HAS_PROPERTY',
    'CONTAINS_TOKEN',
    'NOT_CONTAINS_TOKEN'
]);

const FilterSchema = z.object({
    propertyName: z.string().describe('The property name to filter on'),
    operator: FilterOperatorSchema.describe('The filter operator'),
    value: z.string().optional().describe('The value to match (for single-value operators)'),
    values: z.array(z.string()).optional().describe('The values to match (for multi-value operators like IN)'),
    highValue: z.string().optional().describe('The upper boundary for BETWEEN operator')
});

const FilterGroupSchema = z.object({
    filters: z.array(FilterSchema).describe('Array of filters within this group')
});

const InputSchema = z.object({
    query: z.string().optional().describe('Search query string (up to 3000 characters)'),
    cursor: z.string().optional().describe('Pagination cursor from previous response'),
    limit: z.number().min(1).max(200).optional().describe('Maximum results to return (1-200, default: 50)'),
    filterGroups: z.array(FilterGroupSchema).optional().describe('Filter groups for advanced filtering'),
    subject: z.string().optional().describe('Filter by ticket subject (convenience filter)'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().describe('Filter by ticket priority'),
    category: z.string().optional().describe('Filter by ticket category'),
    pipeline: z.string().optional().describe('Filter by pipeline ID'),
    pipelineStage: z.string().optional().describe('Filter by pipeline stage ID')
});

const TicketSchema = z.object({
    id: z.string(),
    subject: z.union([z.string(), z.null()]),
    content: z.union([z.string(), z.null()]),
    priority: z.union([z.string(), z.null()]),
    category: z.union([z.string(), z.null()]),
    pipeline: z.union([z.string(), z.null()]),
    pipelineStage: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()]),
    archived: z.boolean()
});

const OutputSchema = z.object({
    tickets: z.array(TicketSchema).describe('Array of matching tickets'),
    next_cursor: z.union([z.string(), z.null()]).describe('Cursor for next page (null if no more results)'),
    total: z.number().describe('Total number of matching results')
});

const action = createAction({
    description: 'Search tickets by criteria',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/search-tickets',
        group: 'Tickets'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const filterGroups: any[] = [];

        if (input.filterGroups && input.filterGroups.length > 0) {
            filterGroups.push(...input.filterGroups);
        }

        const convenienceFilters: any[] = [];
        if (input.subject) {
            convenienceFilters.push({
                propertyName: 'subject',
                operator: 'EQ',
                value: input.subject
            });
        }
        if (input.priority) {
            convenienceFilters.push({
                propertyName: 'hs_ticket_priority',
                operator: 'EQ',
                value: input.priority
            });
        }
        if (input.category) {
            convenienceFilters.push({
                propertyName: 'hs_ticket_category',
                operator: 'EQ',
                value: input.category
            });
        }
        if (input.pipeline) {
            convenienceFilters.push({
                propertyName: 'hs_pipeline',
                operator: 'EQ',
                value: input.pipeline
            });
        }
        if (input.pipelineStage) {
            convenienceFilters.push({
                propertyName: 'hs_pipeline_stage',
                operator: 'EQ',
                value: input.pipelineStage
            });
        }

        if (convenienceFilters.length > 0) {
            filterGroups.push({ filters: convenienceFilters });
        }

        const requestBody: any = {
            limit: input.limit || 50,
            filterGroups: filterGroups.length > 0 ? filterGroups : [{ filters: [] }],
            sorts: [],
            properties: ['subject', 'content', 'hs_ticket_priority', 'hs_ticket_category', 'hs_pipeline', 'hs_pipeline_stage'],
            after: input.cursor || ''
        };

        if (input.query) {
            requestBody.query = input.query;
        }

        // https://developers.hubspot.com/docs/api-reference/crm-tickets-v3/search
        const response = await nango.post({
            endpoint: '/crm/v3/objects/tickets/search',
            data: requestBody,
            retries: 3
        });

        const data = response.data;

        const tickets = (data.results || []).map((ticket: any) => ({
            id: ticket.id,
            subject: ticket.properties?.['subject'] ?? null,
            content: ticket.properties?.['content'] ?? null,
            priority: ticket.properties?.['hs_ticket_priority'] ?? null,
            category: ticket.properties?.['hs_ticket_category'] ?? null,
            pipeline: ticket.properties?.['hs_pipeline'] ?? null,
            pipelineStage: ticket.properties?.['hs_pipeline_stage'] ?? null,
            created_at: ticket.createdAt ?? null,
            updated_at: ticket.updatedAt ?? null,
            archived: ticket.archived || false
        }));

        return {
            tickets,
            next_cursor: data.paging?.next?.after || null,
            total: data.total || 0
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
