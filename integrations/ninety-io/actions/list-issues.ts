import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    team: z.string().optional().describe('Team ID to filter by. Example: "6a616ba8908190d6d9458153"'),
    interval: z.string().optional().describe('Interval ID to filter by.'),
    search: z.string().optional().describe('Search text to filter issues.'),
    sortField: z.string().optional().describe('Field to sort by. Example: "title"'),
    sortDirection: z.string().optional().describe('Sort direction. Example: "asc" or "desc"'),
    pageSize: z.number().optional().describe('Number of items per page. Example: 10'),
    pageIndex: z.number().optional().describe('Page index (0-based). Example: 0')
});

const IssueSchema = z
    .object({
        _id: z.string(),
        title: z.unknown().optional(),
        notes: z.unknown().optional(),
        team: z.unknown().optional(),
        teamId: z.unknown().optional(),
        interval: z.unknown().optional(),
        intervalId: z.unknown().optional(),
        user: z.unknown().optional(),
        userId: z.unknown().optional(),
        createdByUserId: z.unknown().optional(),
        updatedBy: z.unknown().optional(),
        createdDate: z.unknown().optional(),
        updatedDate: z.unknown().optional(),
        deleted: z.unknown().optional(),
        deletedDate: z.unknown().optional(),
        deletedByUserId: z.unknown().optional(),
        statusCode: z.unknown().optional(),
        priorityCode: z.unknown().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    currentPage: z.number().optional(),
    items: z.array(IssueSchema),
    itemsCount: z.number().optional(),
    totalCount: z.number().optional(),
    totalPages: z.number().optional()
});

const action = createAction({
    description: 'Query issues with filtering by team, interval, and search text.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};
        if (input.team !== undefined) {
            body['team'] = input.team;
        }
        if (input.interval !== undefined) {
            body['interval'] = input.interval;
        }
        if (input.search !== undefined) {
            body['search'] = input.search;
        }
        if (input.sortField !== undefined) {
            body['sortField'] = input.sortField;
        }
        if (input.sortDirection !== undefined) {
            body['sortDirection'] = input.sortDirection;
        }
        if (input.pageSize !== undefined) {
            body['pageSize'] = input.pageSize;
        }
        if (input.pageIndex !== undefined) {
            body['pageIndex'] = input.pageIndex;
        }

        const response = await nango.post({
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            endpoint: '/v1/issues/query',
            data: body,
            retries: 3
        });

        const raw = response.data;

        if (raw === null || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from issues query endpoint'
            });
        }

        const items = Array.isArray(raw.items) ? raw.items : [];
        const parsedItems = items.map((item: unknown) => {
            if (item === null || typeof item !== 'object') {
                return {};
            }
            return IssueSchema.parse(item);
        });

        return {
            ...(typeof raw.currentPage === 'number' && { currentPage: raw.currentPage }),
            items: parsedItems,
            ...(typeof raw.itemsCount === 'number' && { itemsCount: raw.itemsCount }),
            ...(typeof raw.totalCount === 'number' && { totalCount: raw.totalCount }),
            ...(typeof raw.totalPages === 'number' && { totalPages: raw.totalPages })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
