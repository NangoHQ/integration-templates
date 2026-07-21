import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().optional().describe('Filter tasks by project ID. Example: "6h78PW84RjxxRW8q"'),
    section_id: z.string().optional().describe('Filter tasks by section ID. Example: "6h78Pcqxgv66G2rq"'),
    label: z.string().optional().describe('Filter tasks by label name. Example: "nango-seed-keep"'),
    ids: z.string().optional().describe('Comma-separated list of task IDs to fetch. Example: "6h78Phpj8jH59jWq,6h78PhwG6Mpjx4PH"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(200).optional().describe('Maximum number of tasks to return per page. Example: 50')
});

const TaskSchema = z
    .object({
        id: z.string(),
        content: z.string(),
        description: z.string().optional(),
        project_id: z.string(),
        section_id: z.string().nullable(),
        parent_id: z.string().nullable(),
        labels: z.array(z.string()).optional(),
        priority: z.number().int().min(1).max(4).optional(),
        due: z
            .object({
                date: z.string().optional(),
                string: z.string().optional(),
                lang: z.string().optional(),
                is_recurring: z.boolean().optional()
            })
            .nullable(),
        assignee_id: z.string().nullable().optional(),
        assigner_id: z.string().nullable().optional(),
        creator_id: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        duration: z
            .object({
                amount: z.number().int().optional(),
                unit: z.string().optional()
            })
            .nullable(),
        deadline: z
            .object({
                date: z.string().optional(),
                lang: z.string().optional()
            })
            .nullable(),
        is_collapsed: z.boolean().optional(),
        order: z.number().int().optional(),
        url: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    results: z.array(TaskSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List active (non-completed) Todoist tasks.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.todoist.com/api/v1#get-active-tasks
        const response = await nango.get({
            endpoint: '/api/v1/tasks',
            params: {
                ...(input.project_id !== undefined && { project_id: input.project_id }),
                ...(input.section_id !== undefined && { section_id: input.section_id }),
                ...(input.label !== undefined && { label: input.label }),
                ...(input.ids !== undefined && { ids: input.ids }),
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        if (response.data === null || typeof response.data !== 'object') {
            throw new Error('Unexpected response from Todoist API: non-object response');
        }

        const data = response.data;

        const results = 'results' in data && Array.isArray(data.results) ? data.results : [];
        const nextCursor = 'next_cursor' in data && typeof data.next_cursor === 'string' ? data.next_cursor : undefined;

        const parsedResults = results.map((item: unknown) => {
            return TaskSchema.parse(item);
        });

        return {
            results: parsedResults,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
