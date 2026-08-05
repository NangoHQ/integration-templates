import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page. Example: "1"'),
    per_page: z.number().int().min(1).max(100).optional().describe('Number of items per page. Example: 20'),
    project_id: z.string().optional().describe('Filter RFIs by project ID. Example: "6a71de59f55241acad0cd44e"'),
    statuses: z
        .array(
            z.enum([
                'draft',
                'submitted',
                'rfi-clarification',
                'responded',
                'solution-clarification',
                'closed',
                'converted-to-project-rfi',
                'archived',
                'design-review'
            ])
        )
        .optional()
        .describe('Filter RFIs by status.')
});

const RfiSchema = z.object({
    id: z.string(),
    project_id: z.string(),
    title: z.string(),
    rfi_number: z.string(),
    due_date: z.string(),
    submitted_date: z.string().nullable().optional(),
    status: z.enum([
        'draft',
        'submitted',
        'rfi-clarification',
        'responded',
        'solution-clarification',
        'closed',
        'converted-to-project-rfi',
        'archived',
        'design-review'
    ]),
    priority: z.enum(['low-priority', 'medium-priority', 'high-priority']),
    ball_in_court_id: z.string().nullable().optional(),
    manager_id: z.string().nullable().optional(),
    official_reviewer_id: z.string().nullable().optional(),
    responsible_contractor_ids: z.array(z.string()),
    question: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    created_by: z.string(),
    updated_by: z.string(),
    external_references: z.array(z.string()),
    document_ids: z.array(z.string()),
    solution_ids: z.array(z.string()),
    source_platform: z.string().nullable().optional()
});

const ListResponseSchema = z.object({
    items: z.array(RfiSchema),
    total: z.number().int(),
    page: z.number().int().nullable().optional(),
    per_page: z.number().int().nullable().optional(),
    first_page_url: z.string().nullable().optional(),
    last_page_url: z.string().nullable().optional(),
    next_page_url: z.string().nullable().optional(),
    prev_page_url: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(RfiSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List Requests for Information (RFIs) across projects.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let page = 1;
        let perPage = input.per_page;

        // The page size is encoded in the cursor (rather than relying solely on the page number)
        // so that a caller supplying a different per_page on a follow-up call can't desync the
        // scan and skip or repeat RFIs.
        if (input.cursor !== undefined) {
            const match = /^(\d+):(\d+)$/.exec(input.cursor);
            const pageStr = match?.[1];
            const perPageStr = match?.[2];
            if (pageStr === undefined || perPageStr === undefined) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'cursor must be a value returned by a previous call to this action'
                });
            }
            page = parseInt(pageStr, 10);
            perPage = parseInt(perPageStr, 10);
            if (page < 1) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'cursor must be a value returned by a previous call to this action'
                });
            }
        }

        // https://api.ingenious.build/reference/v2-get-rfis-list-1.md
        const response = await nango.get({
            endpoint: '/api/v2/pub/rfis',
            params: {
                page: page,
                ...(perPage !== undefined && { per_page: perPage }),
                ...(input.project_id !== undefined && { project_id: input.project_id }),
                ...(input.statuses !== undefined && input.statuses.length > 0 && { statuses: input.statuses })
            },
            retries: 3
        });

        const raw = ListResponseSchema.parse(response.data);

        const nextCursor = raw.next_page_url != null ? `${page + 1}:${perPage ?? 20}` : undefined;

        return {
            items: raw.items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
