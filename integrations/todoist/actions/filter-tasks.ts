import { z } from 'zod';
import { createAction } from 'nango';

const RawTaskSchema = z.object({
    id: z.string(),
    content: z.string(),
    description: z.string().optional(),
    project_id: z.string(),
    section_id: z.string().nullable().optional(),
    parent_id: z.string().nullable().optional(),
    checked: z.boolean().optional(),
    labels: z.array(z.string()).optional(),
    priority: z.number(),
    note_count: z.number().optional(),
    added_at: z.string().optional(),
    added_by_uid: z.string().optional(),
    responsible_uid: z.string().nullable().optional(),
    assigned_by_uid: z.string().nullable().optional(),
    due: z
        .object({
            date: z.string().optional(),
            string: z.string().optional(),
            lang: z.string().optional(),
            is_recurring: z.boolean().optional(),
            datetime: z.string().nullable().optional(),
            timezone: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    duration: z
        .object({
            amount: z.number(),
            unit: z.string()
        })
        .nullable()
        .optional(),
    deadline: z
        .object({
            date: z.string().optional(),
            lang: z.string().optional()
        })
        .nullable()
        .optional(),
    url: z.string().optional(),
    is_collapsed: z.boolean().optional(),
    is_deleted: z.boolean().optional(),
    completed_at: z.string().nullable().optional(),
    completed_by_uid: z.string().nullable().optional(),
    updated_at: z.string().optional(),
    child_order: z.number().optional(),
    day_order: z.number().optional(),
    goal_ids: z.array(z.string()).optional(),
    completed_count: z.number().optional(),
    postponed_count: z.number().optional()
});

const TaskSchema = z.object({
    id: z.string(),
    content: z.string(),
    description: z.string().optional(),
    project_id: z.string(),
    section_id: z.string().optional(),
    parent_id: z.string().optional(),
    checked: z.boolean().optional(),
    labels: z.array(z.string()).optional(),
    priority: z.number(),
    note_count: z.number().optional(),
    added_at: z.string().optional(),
    added_by_uid: z.string().optional(),
    responsible_uid: z.string().optional(),
    assigned_by_uid: z.string().optional(),
    due: z
        .object({
            date: z.string().optional(),
            string: z.string().optional(),
            lang: z.string().optional(),
            is_recurring: z.boolean().optional(),
            datetime: z.string().optional(),
            timezone: z.string().optional()
        })
        .optional(),
    duration: z
        .object({
            amount: z.number(),
            unit: z.string()
        })
        .optional(),
    deadline: z
        .object({
            date: z.string().optional(),
            lang: z.string().optional()
        })
        .optional(),
    url: z.string().optional(),
    is_collapsed: z.boolean().optional(),
    is_deleted: z.boolean().optional(),
    completed_at: z.string().optional(),
    completed_by_uid: z.string().optional(),
    updated_at: z.string().optional(),
    child_order: z.number().optional(),
    day_order: z.number().optional(),
    goal_ids: z.array(z.string()).optional(),
    completed_count: z.number().optional(),
    postponed_count: z.number().optional()
});

const InputSchema = z.object({
    query: z.string().min(1).max(1024).describe('Todoist filter query. Example: "today | overdue", "p1 & #Work"'),
    lang: z.string().optional().describe('Language code for parsing the query. Example: "en"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(200).optional().describe('Maximum number of tasks to return per page. Example: 50')
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
    scopes: ['data:read'],

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
                ...(task.section_id != null && { section_id: task.section_id }),
                ...(task.parent_id != null && { parent_id: task.parent_id }),
                priority: task.priority,
                ...(task.checked !== undefined && { checked: task.checked }),
                ...(task.labels !== undefined && { labels: task.labels }),
                ...(task.note_count !== undefined && { note_count: task.note_count }),
                ...(task.added_at !== undefined && { added_at: task.added_at }),
                ...(task.added_by_uid !== undefined && { added_by_uid: task.added_by_uid }),
                ...(task.responsible_uid != null && { responsible_uid: task.responsible_uid }),
                ...(task.assigned_by_uid != null && { assigned_by_uid: task.assigned_by_uid }),
                ...(task.due != null && {
                    due: {
                        ...(task.due.date !== undefined && { date: task.due.date }),
                        ...(task.due.string !== undefined && { string: task.due.string }),
                        ...(task.due.lang !== undefined && { lang: task.due.lang }),
                        ...(task.due.is_recurring !== undefined && { is_recurring: task.due.is_recurring }),
                        ...(task.due.datetime != null && { datetime: task.due.datetime }),
                        ...(task.due.timezone != null && { timezone: task.due.timezone })
                    }
                }),
                ...(task.duration != null && {
                    duration: {
                        amount: task.duration.amount,
                        unit: task.duration.unit
                    }
                }),
                ...(task.deadline != null && {
                    deadline: {
                        ...(task.deadline.date !== undefined && { date: task.deadline.date }),
                        ...(task.deadline.lang !== undefined && { lang: task.deadline.lang })
                    }
                }),
                ...(task.url !== undefined && { url: task.url }),
                ...(task.is_collapsed !== undefined && { is_collapsed: task.is_collapsed }),
                ...(task.is_deleted !== undefined && { is_deleted: task.is_deleted }),
                ...(task.completed_at != null && { completed_at: task.completed_at }),
                ...(task.completed_by_uid != null && { completed_by_uid: task.completed_by_uid }),
                ...(task.updated_at !== undefined && { updated_at: task.updated_at }),
                ...(task.child_order !== undefined && { child_order: task.child_order }),
                ...(task.day_order !== undefined && { day_order: task.day_order }),
                ...(task.goal_ids !== undefined && { goal_ids: task.goal_ids }),
                ...(task.completed_count !== undefined && { completed_count: task.completed_count }),
                ...(task.postponed_count !== undefined && { postponed_count: task.postponed_count })
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
