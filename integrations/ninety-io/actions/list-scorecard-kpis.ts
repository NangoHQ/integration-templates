import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page index). Omit for the first page.'),
    pageSize: z.number().optional().describe('Number of items per page.'),
    searchText: z.string().optional().describe('Free-text search over title and description.'),
    searchTitle: z.string().optional().describe('Search by title only.'),
    searchOwner: z.string().optional().describe('Search by owner name fragment.'),
    unassignedOnly: z.boolean().optional().describe('Return only unassigned KPIs.'),
    userIds: z.array(z.string()).optional().describe('Filter by owner user IDs.'),
    excludeKpiIds: z.array(z.string()).optional().describe('Exclude specific KPI IDs from results.'),
    periodInterval: z.string().optional().describe('Filter by period interval (e.g., Annual, Quarterly).'),
    sortField: z.string().optional().describe('Field to sort by (e.g., id, owner, title).'),
    sortDirection: z.string().optional().describe('Sort direction (e.g., asc, desc).')
});

const ProviderKpiItemSchema = z
    .object({
        _id: z.string(),
        title: z.string(),
        periodInterval: z.string().nullable().optional(),
        unit: z.string().nullable().optional(),
        currency: z.string().nullable().optional(),
        defaultGoal: z.unknown().nullable().optional(),
        userId: z.string().nullable().optional(),
        userFullName: z.string().nullable().optional(),
        type: z.string().nullable().optional(),
        attachmentCount: z.number().nullable().optional(),
        isSmart: z.boolean().nullable().optional(),
        isUsedInFormula: z.boolean().nullable().optional(),
        lastScoreUpdatedAt: z.string().nullable().optional(),
        teams: z.unknown().nullable().optional(),
        scorecards: z.unknown().nullable().optional()
    })
    .passthrough();

const OutputKpiItemSchema = z
    .object({
        _id: z.string(),
        title: z.string(),
        periodInterval: z.string().optional(),
        unit: z.string().optional(),
        currency: z.string().optional(),
        defaultGoal: z.unknown().optional(),
        userId: z.string().optional(),
        userFullName: z.string().optional(),
        type: z.string().optional(),
        attachmentCount: z.number().optional(),
        isSmart: z.boolean().optional(),
        isUsedInFormula: z.boolean().optional(),
        lastScoreUpdatedAt: z.string().optional(),
        teams: z.unknown().optional(),
        scorecards: z.unknown().optional()
    })
    .passthrough();

const PaginatedResponseSchema = z.object({
    currentPage: z.number(),
    items: z.array(z.unknown()),
    itemsCount: z.number(),
    totalCount: z.number(),
    totalPages: z.number()
});

const OutputSchema = z.object({
    items: z.array(OutputKpiItemSchema),
    currentPage: z.number(),
    itemsCount: z.number(),
    totalCount: z.number(),
    totalPages: z.number(),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'Query measurables (KPIs) with filtering.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            ...(input.cursor !== undefined && { pageIndex: Number(input.cursor) }),
            ...(input.pageSize !== undefined && { pageSize: input.pageSize }),
            ...(input.searchText !== undefined && { searchText: input.searchText }),
            ...(input.searchTitle !== undefined && { searchTitle: input.searchTitle }),
            ...(input.searchOwner !== undefined && { searchOwner: input.searchOwner }),
            ...(input.unassignedOnly !== undefined && { unassignedOnly: input.unassignedOnly }),
            ...(input.userIds !== undefined && { userIds: input.userIds }),
            ...(input.excludeKpiIds !== undefined && { excludeKpiIds: input.excludeKpiIds }),
            ...(input.periodInterval !== undefined && { periodInterval: input.periodInterval }),
            ...(input.sortField !== undefined && { sortField: input.sortField }),
            ...(input.sortDirection !== undefined && { sortDirection: input.sortDirection })
        };

        const response = await nango.post({
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            // https://api.public.ninety.io/v1/swagger
            endpoint: '/v1/scorecard/kpis/query',
            data: body,
            retries: 3
        });

        const raw = PaginatedResponseSchema.parse(response.data);

        const items = raw.items.map((item: unknown) => {
            const parsed = ProviderKpiItemSchema.parse(item);
            const normalized: Record<string, unknown> = {
                _id: parsed._id,
                title: parsed.title
            };

            for (const [key, value] of Object.entries(parsed)) {
                if (key === '_id' || key === 'title') {
                    continue;
                }
                if (value != null) {
                    normalized[key] = value;
                }
            }

            return OutputKpiItemSchema.parse(normalized);
        });

        const nextCursor = raw.currentPage < raw.totalPages ? String(raw.currentPage + 1) : undefined;

        return {
            items,
            currentPage: raw.currentPage,
            itemsCount: raw.itemsCount,
            totalCount: raw.totalCount,
            totalPages: raw.totalPages,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
