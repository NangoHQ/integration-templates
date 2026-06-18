import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).optional().describe('Number of deals to return per page. Example: 20'),
    search: z.string().optional().describe('Search text to use with search_field parameter.'),
    search_field: z.string().optional().describe('Field to search for.'),
    title: z.string().optional().describe("Filter by deal's title."),
    stage: z.number().optional().describe("Filter by deal's stage ID."),
    group: z.number().optional().describe("Filter by deal's pipeline ID."),
    status: z.number().optional().describe("Filter by deal's status."),
    owner: z.number().optional().describe("Filter by deal's owner ID."),
    created_after: z.string().optional().describe('Returns deals created greater than or equal to given date (YYYY-MM-DD).'),
    updated_after: z.string().optional().describe('Returns deals updated greater than or equal to given date (YYYY-MM-DD).')
});

const ProviderDealSchema = z.object({
    id: z.union([z.string(), z.number()]),
    title: z.string().nullable().optional(),
    value: z.union([z.string(), z.number()]).nullable().optional(),
    currency: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    contact: z.union([z.string(), z.number()]).nullable().optional(),
    group: z.union([z.string(), z.number()]).nullable().optional(),
    stage: z.union([z.string(), z.number()]).nullable().optional(),
    owner: z.union([z.string(), z.number()]).nullable().optional(),
    cdate: z.string().nullable().optional(),
    mdate: z.string().nullable().optional(),
    nextdate: z.string().nullable().optional(),
    nexttaskid: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    deals: z.array(z.unknown()),
    meta: z
        .object({
            total: z.union([z.string(), z.number()]).optional()
        })
        .passthrough()
        .optional()
});

const DealOutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    value: z.string().optional(),
    currency: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    contact: z.string().optional(),
    group: z.string().optional(),
    stage: z.string().optional(),
    owner: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    next_date: z.string().optional(),
    next_task_id: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(DealOutputSchema),
    next_cursor: z.string().optional()
});

function encodeCursor(offset: number): string {
    return Buffer.from(String(offset)).toString('base64');
}

function decodeCursor(cursor: string): number {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = parseInt(decoded, 10);
    if (Number.isNaN(parsed) || parsed < 0 || String(parsed) !== decoded) {
        throw new Error(`Invalid pagination cursor: "${cursor}"`);
    }
    return parsed;
}

const action = createAction({
    description: 'List deals from ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor ? decodeCursor(input.cursor) : 0;
        const limit = input.limit ?? 20;

        const params: Record<string, string | number> = {
            limit: limit,
            offset: offset
        };

        if (input.search !== undefined) {
            params['filters[search]'] = input.search;
        }
        if (input.search_field !== undefined) {
            params['filters[search_field]'] = input.search_field;
        }
        if (input.title !== undefined) {
            params['filters[title]'] = input.title;
        }
        if (input.stage !== undefined) {
            params['filters[stage]'] = input.stage;
        }
        if (input.group !== undefined) {
            params['filters[group]'] = input.group;
        }
        if (input.status !== undefined) {
            params['filters[status]'] = input.status;
        }
        if (input.owner !== undefined) {
            params['filters[owner]'] = input.owner;
        }
        if (input.created_after !== undefined) {
            params['filters[created_after]'] = input.created_after;
        }
        if (input.updated_after !== undefined) {
            params['filters[updated_after]'] = input.updated_after;
        }

        const response = await nango.get({
            // https://developers.activecampaign.com/reference/list-all-deals
            endpoint: '/3/deals',
            params: params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.deals.map((deal: unknown) => {
            const parsed = ProviderDealSchema.parse(deal);
            return {
                id: String(parsed.id),
                ...(parsed.title != null && { title: parsed.title }),
                ...(parsed.value != null && { value: String(parsed.value) }),
                ...(parsed.currency != null && { currency: parsed.currency }),
                ...(parsed.description != null && { description: parsed.description }),
                ...(parsed.status != null && { status: parsed.status }),
                ...(parsed.contact != null && { contact: String(parsed.contact) }),
                ...(parsed.group != null && { group: String(parsed.group) }),
                ...(parsed.stage != null && { stage: String(parsed.stage) }),
                ...(parsed.owner != null && { owner: String(parsed.owner) }),
                ...(parsed.cdate != null && { created_at: parsed.cdate }),
                ...(parsed.mdate != null && { updated_at: parsed.mdate }),
                ...(parsed.nextdate != null && { next_date: parsed.nextdate }),
                ...(parsed.nexttaskid != null && { next_task_id: parsed.nexttaskid })
            };
        });

        const nextOffset = offset + items.length;
        const total = providerResponse.meta?.total;
        const totalNum = total ? (typeof total === 'number' ? total : parseInt(total, 10)) : null;
        const hasMore = totalNum !== null ? nextOffset < totalNum : items.length === limit;

        return {
            items: items,
            ...(hasMore && { next_cursor: encodeCursor(nextOffset) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
