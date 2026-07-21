import { z } from 'zod';
import { createAction } from 'nango';

const DueSchema = z
    .object({
        date: z.string(),
        string: z.string(),
        lang: z.string().optional(),
        is_recurring: z.boolean().optional(),
        datetime: z.string().nullable().optional()
    })
    .optional();

const DurationSchema = z
    .object({
        amount: z.number(),
        unit: z.string()
    })
    .optional();

const DeadlineSchema = z
    .object({
        date: z.string(),
        lang: z.string().optional()
    })
    .optional();

const RawTaskSchema = z.object({
    id: z.string(),
    content: z.string(),
    description: z.string().optional(),
    project_id: z.string(),
    section_id: z.string().nullable().optional(),
    parent_id: z.string().nullable().optional(),
    priority: z.number(),
    order: z.number().optional(),
    labels: z.array(z.string()).optional(),
    due: DueSchema.nullable().optional(),
    duration: DurationSchema.nullable().optional(),
    assigner_id: z.string().nullable().optional(),
    assignee_id: z.string().nullable().optional(),
    creator_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    is_collapsed: z.boolean().optional(),
    url: z.string().optional(),
    deadline: DeadlineSchema.nullable().optional()
});

const TaskSchema = z.object({
    id: z.string(),
    content: z.string(),
    description: z.string().optional(),
    project_id: z.string(),
    section_id: z.string().nullable().optional(),
    parent_id: z.string().nullable().optional(),
    priority: z.number(),
    order: z.number().optional(),
    labels: z.array(z.string()).optional(),
    due: DueSchema,
    duration: DurationSchema,
    assigner_id: z.string().nullable().optional(),
    assignee_id: z.string().nullable().optional(),
    creator_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    is_collapsed: z.boolean().optional(),
    url: z.string().optional(),
    deadline: DeadlineSchema
});

const InputSchema = z.object({
    query: z.string().describe('Todoist filter query. Example: "today | overdue", "p1 & #Work"'),
    lang: z.string().optional().describe('Language code for parsing the query. Example: "en"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of tasks to return per page. Example: 50')
});

const ProviderResponseSchema = z.object({
    results: z.array(z.unknown()),
    next_cursor: z.string().nullable().optional()
});

const OutputSchema = z.object({
    results: z.array(TaskSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List tasks matching a Todoist filter query.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['task:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            query: input.query
        };

        if (input.lang !== undefined) {
            params['lang'] = input.lang;
        }

        if (input.cursor !== undefined) {
            params['cursor'] = input.cursor;
        }

        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        // https://developer.todoist.com/api/v1#get-tasks-by-filter
        const response = await nango.get({
            endpoint: '/api/v1/tasks/filter',
            params,
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Response failed schema validation',
                details: parsedResponse.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            });
        }

        const validated = parsedResponse.data;

        const tasks = validated.results.map((item: unknown) => {
            const parsed = RawTaskSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Task object failed schema validation',
                    details: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                });
            }
            const task = parsed.data;
            return {
                id: task.id,
                content: task.content,
                ...(task.description !== undefined && { description: task.description }),
                project_id: task.project_id,
                ...(task.section_id !== undefined && { section_id: task.section_id }),
                ...(task.parent_id !== undefined && { parent_id: task.parent_id }),
                priority: task.priority,
                ...(task.order !== undefined && { order: task.order }),
                ...(task.labels !== undefined && { labels: task.labels }),
                ...(task.due !== undefined && task.due !== null && { due: task.due }),
                ...(task.duration !== undefined && task.duration !== null && { duration: task.duration }),
                ...(task.assigner_id !== undefined && { assigner_id: task.assigner_id }),
                ...(task.assignee_id !== undefined && { assignee_id: task.assignee_id }),
                ...(task.creator_id !== undefined && { creator_id: task.creator_id }),
                ...(task.created_at !== undefined && { created_at: task.created_at }),
                ...(task.updated_at !== undefined && { updated_at: task.updated_at }),
                ...(task.is_collapsed !== undefined && { is_collapsed: task.is_collapsed }),
                ...(task.url !== undefined && { url: task.url }),
                ...(task.deadline !== undefined && task.deadline !== null && { deadline: task.deadline })
            };
        });

        return {
            results: tasks,
            ...(validated.next_cursor != null && { next_cursor: validated.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
