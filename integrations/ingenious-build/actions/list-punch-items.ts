import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().optional().describe('Project ID to filter punch items by. Example: "6a71de59f55241acad0cd44e"'),
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().int().min(1).max(100).optional().describe('Number of items per page. Defaults to provider default.')
});

const ProviderPunchItemSchema = z.object({
    id: z.string(),
    internal_id: z.number().int(),
    project_id: z.string(),
    punch_list_id: z.string().nullable(),
    status: z.string(),
    stamp_id: z.string().nullable(),
    title: z.string(),
    due_date: z.string(),
    comment: z.string().nullable(),
    originator_id: z.string(),
    ball_in_court_id: z.string().nullable(),
    responsible_contractor_id: z.string().nullable(),
    members_ids: z.array(z.string()),
    site_ids: z.array(z.string()),
    documents_ids: z.array(z.string()),
    external_references: z.array(z.string()),
    external_id: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    solution_ids: z.array(z.string())
});

const ProviderListResponseSchema = z.object({
    items: z.array(ProviderPunchItemSchema.passthrough()),
    total: z.number().int(),
    page: z.number().int().nullable(),
    per_page: z.number().int().nullable(),
    first_page_url: z.string().nullable(),
    last_page_url: z.string().nullable(),
    next_page_url: z.string().nullable(),
    prev_page_url: z.string().nullable()
});

const PunchItemSchema = z.object({
    id: z.string(),
    internal_id: z.number().int(),
    project_id: z.string(),
    punch_list_id: z.string().optional(),
    status: z.string(),
    stamp_id: z.string().optional(),
    title: z.string(),
    due_date: z.string(),
    comment: z.string().optional(),
    originator_id: z.string(),
    ball_in_court_id: z.string().optional(),
    responsible_contractor_id: z.string().optional(),
    members_ids: z.array(z.string()),
    site_ids: z.array(z.string()),
    documents_ids: z.array(z.string()),
    external_references: z.array(z.string()),
    external_id: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    solution_ids: z.array(z.string())
});

const OutputSchema = z.object({
    items: z.array(PunchItemSchema),
    next_cursor: z.string().optional()
});

function extractNextCursor(nextPageUrl: unknown): string | undefined {
    if (typeof nextPageUrl !== 'string') {
        return undefined;
    }
    const match = nextPageUrl.match(/[?&]page=(\d+)/);
    return match ? match[1] : undefined;
}

function normalizePunchItem(item: z.infer<typeof ProviderPunchItemSchema>): z.infer<typeof PunchItemSchema> {
    return {
        id: item.id,
        internal_id: item.internal_id,
        project_id: item.project_id,
        ...(item.punch_list_id != null && { punch_list_id: item.punch_list_id }),
        status: item.status,
        ...(item.stamp_id != null && { stamp_id: item.stamp_id }),
        title: item.title,
        due_date: item.due_date,
        ...(item.comment != null && { comment: item.comment }),
        originator_id: item.originator_id,
        ...(item.ball_in_court_id != null && { ball_in_court_id: item.ball_in_court_id }),
        ...(item.responsible_contractor_id != null && { responsible_contractor_id: item.responsible_contractor_id }),
        members_ids: item.members_ids,
        site_ids: item.site_ids,
        documents_ids: item.documents_ids,
        external_references: item.external_references,
        ...(item.external_id != null && { external_id: item.external_id }),
        created_at: item.created_at,
        updated_at: item.updated_at,
        solution_ids: item.solution_ids
    };
}

const action = createAction({
    description: 'List punch-list items (deficiency/completion tracking items) for a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.project_id !== undefined) {
            params['project_id'] = input.project_id;
        }
        if (input.cursor !== undefined) {
            params['page'] = input.cursor;
        }
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }

        const response = await nango.get({
            // https://api.ingenious.build/reference/v2-get-punch-items-list.md
            endpoint: '/api/v2/pub/punch-items',
            params,
            retries: 3
        });

        const listData = ProviderListResponseSchema.parse(response.data);

        return {
            items: listData.items.map(normalizePunchItem),
            next_cursor: extractNextCursor(listData.next_page_url)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
