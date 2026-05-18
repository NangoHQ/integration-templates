import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().int().min(1).optional().describe('Page number to retrieve. Defaults to 1.'),
    per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page. Defaults to 25.'),
    sort_by_field: z
        .enum(['amount', 'is_closed', 'is_won'])
        .optional()
        .describe('Sort deals by amount (largest first), is_closed (closed deals first), or is_won (won deals first).')
});

const PaginationSchema = z.object({
    page: z.number(),
    per_page: z.number(),
    total_entries: z.number(),
    total_pages: z.number()
});

const OpportunitySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    amount: z.number().nullable().optional(),
    closed_date: z.string().nullable().optional(),
    is_closed: z.boolean().optional(),
    is_won: z.boolean().optional(),
    stage_name: z.string().nullable().optional(),
    account_id: z.string().nullable().optional(),
    owner_id: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    created_at: z.string().optional()
});

const OutputSchema = z.object({
    opportunities: z.array(OpportunitySchema),
    pagination: PaginationSchema
});

const ProviderResponseSchema = z.object({
    opportunities: z.array(z.record(z.string(), z.unknown())).optional(),
    pagination: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'List opportunities from Apollo.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-opportunities',
        group: 'Opportunities'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.apollo.io/reference/list-all-deals
        const response = await nango.get({
            endpoint: '/v1/opportunities/search',
            params: {
                ...(input.page !== undefined && { page: input.page }),
                ...(input.per_page !== undefined && { per_page: input.per_page }),
                ...(input.sort_by_field !== undefined && { sort_by_field: input.sort_by_field })
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Apollo API'
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Response does not match expected schema'
            });
        }

        const opportunities = parsed.data.opportunities || [];
        const pagination = parsed.data.pagination || {};

        const mappedOpportunities = opportunities
            .map((o) => {
                if (o === null || typeof o !== 'object') {
                    return null;
                }
                const id = o['id'];
                if (id === undefined || id === null || id === '') {
                    return null;
                }
                const result: Record<string, unknown> = { id: String(id) };
                const name = o['name'];
                if (name !== undefined) {
                    result['name'] = String(name);
                }
                const amount = o['amount'];
                if (amount !== undefined && amount !== null) {
                    result['amount'] = Number(amount);
                }
                const closedDate = o['closed_date'];
                if (closedDate !== undefined && closedDate !== null) {
                    result['closed_date'] = String(closedDate);
                }
                const isClosed = o['is_closed'];
                if (isClosed !== undefined) {
                    result['is_closed'] = Boolean(isClosed);
                }
                const isWon = o['is_won'];
                if (isWon !== undefined) {
                    result['is_won'] = Boolean(isWon);
                }
                const stageName = o['stage_name'];
                if (stageName !== undefined && stageName !== null) {
                    result['stage_name'] = String(stageName);
                }
                const accountId = o['account_id'];
                if (accountId !== undefined && accountId !== null) {
                    result['account_id'] = String(accountId);
                }
                const ownerId = o['owner_id'];
                if (ownerId !== undefined && ownerId !== null) {
                    result['owner_id'] = String(ownerId);
                }
                const description = o['description'];
                if (description !== undefined && description !== null) {
                    result['description'] = String(description);
                }
                const createdAt = o['created_at'];
                if (createdAt !== undefined) {
                    result['created_at'] = String(createdAt);
                }
                return result;
            })
            .filter((o): o is NonNullable<typeof o> => o !== null);

        const validatedPagination = {
            page: Number(pagination['page']) || input.page || 1,
            per_page: Number(pagination['per_page']) || input.per_page || 25,
            total_entries: Number(pagination['total_entries']) || 0,
            total_pages: Number(pagination['total_pages']) || 1
        };

        const validatedOpportunities = z.array(OpportunitySchema).parse(mappedOpportunities);

        return {
            opportunities: validatedOpportunities,
            pagination: validatedPagination
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
