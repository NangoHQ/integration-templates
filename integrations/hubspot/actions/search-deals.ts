import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().optional().describe('Search query to match against default searchable properties (dealname, pipeline, dealstage, description, dealtype)'),
    deal_name: z.string().optional().describe('Filter by deal name (uses CONTAINS_TOKEN operator)'),
    deal_stage: z.string().optional().describe('Filter by deal stage ID'),
    pipeline: z.string().optional().describe('Filter by pipeline ID'),
    min_amount: z.number().optional().describe('Filter by minimum deal amount'),
    max_amount: z.number().optional().describe('Filter by maximum deal amount'),
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.'),
    limit: z.number().optional().describe('Number of results per page (max 200)')
});

const DealSchema = z.object({
    id: z.string(),
    deal_name: z.union([z.string(), z.null()]),
    amount: z.union([z.number(), z.null()]),
    deal_stage: z.union([z.string(), z.null()]),
    pipeline: z.union([z.string(), z.null()]),
    close_date: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    deals: z.array(DealSchema),
    next_cursor: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Search deals by criteria',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/search-deals',
        group: 'Deals'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.deals.read', 'crm.schemas.deals.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build filter groups based on input criteria
        const filterGroups: any[] = [];
        const filters: any[] = [];

        if (input.deal_name) {
            filters.push({
                propertyName: 'dealname',
                operator: 'CONTAINS_TOKEN',
                value: `*${input.deal_name}*`
            });
        }

        if (input.deal_stage) {
            filters.push({
                propertyName: 'dealstage',
                operator: 'EQ',
                value: input.deal_stage
            });
        }

        if (input.pipeline) {
            filters.push({
                propertyName: 'pipeline',
                operator: 'EQ',
                value: input.pipeline
            });
        }

        if (input.min_amount !== undefined) {
            filters.push({
                propertyName: 'amount',
                operator: 'GTE',
                value: input.min_amount.toString()
            });
        }

        if (input.max_amount !== undefined) {
            filters.push({
                propertyName: 'amount',
                operator: 'LTE',
                value: input.max_amount.toString()
            });
        }

        if (filters.length > 0) {
            filterGroups.push({ filters });
        }

        const requestBody: any = {
            limit: Math.min(input.limit || 10, 200),
            properties: ['dealname', 'amount', 'dealstage', 'pipeline', 'closedate', 'createdate', 'hs_lastmodifieddate'],
            ...(input.query && { query: input.query }),
            ...(filterGroups.length > 0 && { filterGroups }),
            ...(input.cursor && { after: input.cursor })
        };

        // https://developers.hubspot.com/docs/api/crm/search
        const response = await nango.post({
            endpoint: '/crm/v3/objects/deals/search',
            data: requestBody,
            retries: 3
        });

        const data = response.data;

        const deals = (data.results || []).map((deal: any) => ({
            id: deal.id,
            deal_name: deal.properties?.['dealname'] ?? null,
            amount: deal.properties?.['amount'] ? parseFloat(deal.properties['amount']) : null,
            deal_stage: deal.properties?.['dealstage'] ?? null,
            pipeline: deal.properties?.['pipeline'] ?? null,
            close_date: deal.properties?.['closedate'] ?? null,
            created_at: deal.createdAt ?? null,
            updated_at: deal.updatedAt ?? null
        }));

        return {
            deals,
            next_cursor: data.paging?.next?.after || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
