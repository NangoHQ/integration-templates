import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().int().min(1).optional().describe('Page number to retrieve. Default is 1.'),
    per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page. Default is 25.')
});

const PaginationSchema = z.object({
    page: z.number(),
    per_page: z.number(),
    total_entries: z.number(),
    total_pages: z.number()
});

const TaskSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    title: z.string().optional(),
    note: z.string().optional(),
    due_date: z.string().optional(),
    priority: z.string().optional(),
    status: z.string().optional(),
    contact_id: z.string().optional(),
    account_id: z.string().optional(),
    opportunity_id: z.string().optional(),
    owner_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    tasks: z.array(TaskSchema),
    pagination: PaginationSchema
});

const action = createAction({
    description: 'List tasks from Apollo',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.apollo.io/reference/get_tasks-search
        const response = await nango.get({
            endpoint: '/v1/tasks/search',
            params: {
                ...(input.page !== undefined && { page: String(input.page) }),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) })
            },
            retries: 3
        });

        const rawData = response.data;

        if (!rawData || typeof rawData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Apollo API'
            });
        }

        const tasks = Array.isArray(rawData['tasks']) ? rawData['tasks'] : [];
        const pagination = rawData['pagination'] || {};

        return {
            tasks: tasks
                .filter((task: unknown): task is Record<string, unknown> => typeof task === 'object' && task !== null)
                .map((t) => {
                    return {
                        id: String(t['id'] || ''),
                        type: t['type'] !== undefined ? String(t['type']) : undefined,
                        title: t['title'] !== undefined ? String(t['title']) : undefined,
                        note: t['note'] !== undefined ? String(t['note']) : undefined,
                        due_date: t['due_date'] !== undefined ? String(t['due_date']) : undefined,
                        priority: t['priority'] !== undefined ? String(t['priority']) : undefined,
                        status: t['status'] !== undefined ? String(t['status']) : undefined,
                        contact_id: t['contact_id'] !== undefined ? String(t['contact_id']) : undefined,
                        account_id: t['account_id'] !== undefined ? String(t['account_id']) : undefined,
                        opportunity_id: t['opportunity_id'] !== undefined ? String(t['opportunity_id']) : undefined,
                        owner_id: t['owner_id'] !== undefined ? String(t['owner_id']) : undefined,
                        created_at: t['created_at'] !== undefined ? String(t['created_at']) : undefined,
                        updated_at: t['updated_at'] !== undefined ? String(t['updated_at']) : undefined
                    };
                }),
            pagination: {
                page: Number(pagination['page'] || 1),
                per_page: Number(pagination['per_page'] || 25),
                total_entries: Number(pagination['total_entries'] || 0),
                total_pages: Number(pagination['total_pages'] || 1)
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
