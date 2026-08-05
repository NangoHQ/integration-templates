import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().int().min(1).max(100).optional().describe('Number of items per page. Maximum 100. Defaults to 20.'),
    project_id: z.string().optional().describe('Filter tasks by project ID.'),
    type: z.enum(['event', 'general', 'milestone', 'risk', 'punch_item']).optional().describe('Filter by task type.'),
    statuses: z
        .array(z.enum(['NOT_STARTED', 'IN_PROGRESS', 'UNDER_REVIEW', 'DONE', 'ARCHIVED']))
        .optional()
        .describe('Filter by task statuses.'),
    updated_after: z.string().optional().describe('ISO-8601 datetime. Only show objects updated after or equal to this date.'),
    updated_before: z.string().optional().describe('ISO-8601 datetime. Only show objects updated before or equal to this date.'),
    due_date_after: z.string().optional().describe('Date in Y-m-d format. Only show tasks with due date after or equal to this date.'),
    due_date_before: z.string().optional().describe('Date in Y-m-d format. Only show tasks with due date before or equal to this date.')
});

const TaskSchema = z.object({
    id: z.string(),
    originator_id: z.string().optional(),
    name: z.string().optional(),
    project_id: z.string().optional(),
    description: z.string().optional(),
    type: z.enum(['event', 'general', 'milestone', 'risk', 'punch_item']).optional(),
    status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'UNDER_REVIEW', 'DONE', 'ARCHIVED']).optional(),
    priority: z.enum(['PRIORITY_LOW', 'PRIORITY_MEDIUM', 'PRIORITY_HIGH']).optional(),
    is_risk: z.boolean().optional(),
    risk_level: z.enum(['LOW_RISK', 'MEDIUM_RISK', 'HIGH_RISK']).optional(),
    risk_to: z.array(z.enum(['schedule', 'cost', 'scope', 'health_and_safety', 'procurement', 'quality'])).optional(),
    expected_costs: z.number().int().optional(),
    expected_delay_value: z.number().int().optional(),
    expected_delay_unit: z.enum(['DAYS', 'WEEKS', 'MONTHS']).optional(),
    scheduled_variance: z.string().optional(),
    mitigation_strategy: z.string().optional(),
    base_line_date: z.string().optional(),
    anticipated_date: z.string().optional(),
    due_date: z.string().optional(),
    actual_date: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    members_ids: z.array(z.string()).optional(),
    ball_in_court_ids: z.array(z.string()).optional(),
    documents_ids: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    items: z.array(TaskSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List schedule tasks for a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let page = 1;
        let perPage = input.per_page;

        // The page size is encoded in the cursor (rather than relying solely on the page number)
        // so that a caller supplying a different per_page on a follow-up call can't desync the
        // scan and skip or repeat tasks.
        if (input.cursor !== undefined) {
            const match = /^(\d+):(\d+)$/.exec(input.cursor);
            const pageStr = match?.[1];
            const perPageStr = match?.[2];
            if (pageStr === undefined || perPageStr === undefined) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a value returned by a previous call to this action'
                });
            }
            page = parseInt(pageStr, 10);
            perPage = parseInt(perPageStr, 10);
            if (page < 1) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a value returned by a previous call to this action'
                });
            }
        }

        const params: Record<string, string | number | string[]> = {
            page: String(page),
            ...(perPage !== undefined && { per_page: perPage }),
            ...(input.project_id && { project_id: input.project_id }),
            ...(input.type && { type: input.type }),
            ...(input.statuses && { statuses: input.statuses }),
            ...(input.updated_after && { updated_after: input.updated_after }),
            ...(input.updated_before && { updated_before: input.updated_before }),
            ...(input.due_date_after && { due_date_after: input.due_date_after }),
            ...(input.due_date_before && { due_date_before: input.due_date_before })
        };

        // https://api.ingenious.build/reference/indextaskpubv2.md
        const response = await nango.get({
            endpoint: '/api/v2/pub/tasks',
            params,
            retries: 3
        });

        const raw = response.data;
        if (typeof raw !== 'object' || raw === null) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from the tasks API.'
            });
        }

        function isRecord(value: unknown): value is Record<string, unknown> {
            return typeof value === 'object' && value !== null && !Array.isArray(value);
        }

        if (!isRecord(raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from the tasks API.'
            });
        }

        const itemsRaw = raw['items'];
        if (!Array.isArray(itemsRaw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected items array in response.'
            });
        }

        const items = itemsRaw.map((item: unknown) => {
            if (!isRecord(item)) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected item format in tasks list.'
                });
            }
            return TaskSchema.parse(item);
        });

        const nextPageUrl = typeof raw['next_page_url'] === 'string' ? raw['next_page_url'] : null;
        let nextCursor: string | undefined;
        if (nextPageUrl) {
            const match = nextPageUrl.match(/[?&]page=([^&]+)/);
            if (match && match[1]) {
                nextCursor = `${match[1]}:${perPage ?? 20}`;
            }
        }

        return {
            items,
            ...(nextCursor && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
