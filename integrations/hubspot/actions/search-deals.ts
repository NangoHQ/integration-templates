import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().optional().describe('Search query to match against default searchable properties (dealname, pipeline, dealstage, description, dealtype)'),
    dealName: z.string().optional().describe('Filter by deal name (uses CONTAINS_TOKEN operator)'),
    dealStage: z.string().optional().describe('Filter by deal stage ID'),
    pipeline: z.string().optional().describe('Filter by pipeline ID'),
    minAmount: z.number().optional().describe('Filter by minimum deal amount'),
    maxAmount: z.number().optional().describe('Filter by maximum deal amount'),
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.'),
    limit: z.number().optional().describe('Number of results per page (max 200)')
});

const DealSchema = z.object({
    id: z.string(),
    dealName: z.string().optional(),
    amount: z.number().optional(),
    dealStage: z.string().optional(),
    pipeline: z.string().optional(),
    closeDate: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const OutputSchema = z.object({
    deals: z.array(DealSchema),
    nextCursor: z.string().optional()
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

        if (input.dealName) {
            filters.push({
                propertyName: 'dealname',
                operator: 'CONTAINS_TOKEN',
                value: `*${input.dealName}*`
            });
        }

        if (input.dealStage) {
            filters.push({
                propertyName: 'dealstage',
                operator: 'EQ',
                value: input.dealStage
            });
        }

        if (input.pipeline) {
            filters.push({
                propertyName: 'pipeline',
                operator: 'EQ',
                value: input.pipeline
            });
        }

        if (input.minAmount !== undefined) {
            filters.push({
                propertyName: 'amount',
                operator: 'GTE',
                value: input.minAmount.toString()
            });
        }

        if (input.maxAmount !== undefined) {
            filters.push({
                propertyName: 'amount',
                operator: 'LTE',
                value: input.maxAmount.toString()
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
            dealName: deal.properties?.['dealname'] ?? undefined,
            amount: deal.properties?.['amount'] ? parseFloat(deal.properties['amount']) : undefined,
            dealStage: deal.properties?.['dealstage'] ?? undefined,
            pipeline: deal.properties?.['pipeline'] ?? undefined,
            closeDate: deal.properties?.['closedate'] ?? undefined,
            createdAt: deal.createdAt ?? undefined,
            updatedAt: deal.updatedAt ?? undefined
        }));

        return {
            deals,
            nextCursor: data.paging?.next?.after || undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
