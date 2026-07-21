import { z } from 'zod';
import { createAction } from 'nango';

const ProviderDueSchema = z
    .object({
        date: z.string(),
        string: z.string().optional(),
        is_recurring: z.boolean(),
        datetime: z.string().nullable().optional(),
        timezone: z.string().nullable().optional(),
        lang: z.string().optional()
    })
    .passthrough();

const ProviderDeadlineSchema = z
    .object({
        date: z.string(),
        lang: z.string().optional()
    })
    .passthrough();

const ProviderDurationSchema = z
    .object({
        amount: z.number().int(),
        unit: z.string()
    })
    .passthrough();

const ProviderTaskSchema = z
    .object({
        user_id: z.string(),
        id: z.string(),
        project_id: z.string(),
        section_id: z.string().nullable(),
        parent_id: z.string().nullable(),
        added_by_uid: z.string().nullable(),
        assigned_by_uid: z.string().nullable(),
        responsible_uid: z.string().nullable(),
        labels: z.array(z.string()),
        deadline: ProviderDeadlineSchema.nullable(),
        duration: ProviderDurationSchema.nullable(),
        checked: z.boolean(),
        is_deleted: z.boolean(),
        added_at: z.string().nullable(),
        completed_at: z.string().nullable(),
        completed_by_uid: z.string().nullable(),
        updated_at: z.string().nullable(),
        due: ProviderDueSchema.nullable(),
        priority: z.number().int(),
        child_order: z.number().int(),
        content: z.string(),
        description: z.string(),
        note_count: z.number().int(),
        day_order: z.number().int(),
        is_collapsed: z.boolean()
    })
    .passthrough();

const TaskOutputSchema = z.object({
    user_id: z.string(),
    id: z.string(),
    project_id: z.string(),
    section_id: z.string().optional(),
    parent_id: z.string().optional(),
    added_by_uid: z.string().optional(),
    assigned_by_uid: z.string().optional(),
    responsible_uid: z.string().optional(),
    labels: z.array(z.string()),
    deadline: ProviderDeadlineSchema.optional(),
    duration: ProviderDurationSchema.optional(),
    checked: z.boolean(),
    is_deleted: z.boolean(),
    added_at: z.string().optional(),
    completed_at: z.string().optional(),
    completed_by_uid: z.string().optional(),
    updated_at: z.string().optional(),
    due: ProviderDueSchema.optional(),
    priority: z.number().int(),
    child_order: z.number().int(),
    content: z.string(),
    description: z.string(),
    note_count: z.number().int(),
    day_order: z.number().int(),
    is_collapsed: z.boolean()
});

const InputSchema = z.object({
    since: z.string().describe('Start of the due date range, inclusive. Example: "2026-01-01T00:00:00Z"'),
    until: z.string().describe('End of the due date range, exclusive. Example: "2026-01-31T23:59:59Z"'),
    workspace_id: z.number().optional().describe('Limit results to projects in a workspace. Example: 12345678'),
    project_id: z.string().optional().describe('Limit results to a specific project. Example: "6h78PW84RjxxRW8q"'),
    section_id: z.string().optional().describe('Limit results to a specific section. Example: "6h78Pcqxgv66G2rq"'),
    parent_id: z.string().optional().describe('Limit results to items under a specific parent task. Example: "6h78Phpj8jH59jWq"'),
    filter_query: z.string().optional().describe('Filter expression matching supported Todoist filters.'),
    filter_lang: z.string().optional().describe('Language for interpreting filter_query. Example: "en"'),
    cursor: z.string().optional().describe('Pagination cursor from a previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(200).optional().describe('Maximum items per page. Default: 50.')
});

const OutputSchema = z.object({
    items: z.array(TaskOutputSchema),
    next_cursor: z.string().optional()
});

const mapTask = (task: z.infer<typeof ProviderTaskSchema>): z.infer<typeof TaskOutputSchema> => {
    return {
        user_id: task.user_id,
        id: task.id,
        project_id: task.project_id,
        labels: task.labels,
        checked: task.checked,
        is_deleted: task.is_deleted,
        priority: task.priority,
        child_order: task.child_order,
        content: task.content,
        description: task.description,
        note_count: task.note_count,
        day_order: task.day_order,
        is_collapsed: task.is_collapsed,
        ...(task.section_id != null && { section_id: task.section_id }),
        ...(task.parent_id != null && { parent_id: task.parent_id }),
        ...(task.added_by_uid != null && { added_by_uid: task.added_by_uid }),
        ...(task.assigned_by_uid != null && { assigned_by_uid: task.assigned_by_uid }),
        ...(task.responsible_uid != null && { responsible_uid: task.responsible_uid }),
        ...(task.deadline != null && { deadline: task.deadline }),
        ...(task.duration != null && { duration: task.duration }),
        ...(task.added_at != null && { added_at: task.added_at }),
        ...(task.completed_at != null && { completed_at: task.completed_at }),
        ...(task.completed_by_uid != null && { completed_by_uid: task.completed_by_uid }),
        ...(task.updated_at != null && { updated_at: task.updated_at }),
        ...(task.due != null && { due: task.due })
    };
};

const action = createAction({
    description: 'List tasks completed within a date range, filtered by their original due date.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.todoist.com/api/v1/#tag/Tasks/operation/tasks_completed_by_due_date_api_v1_tasks_completed_by_due_date_get
        const response = await nango.get({
            endpoint: '/api/v1/tasks/completed/by_due_date',
            params: {
                since: input.since,
                until: input.until,
                ...(input.workspace_id !== undefined && { workspace_id: input.workspace_id }),
                ...(input.project_id !== undefined && { project_id: input.project_id }),
                ...(input.section_id !== undefined && { section_id: input.section_id }),
                ...(input.parent_id !== undefined && { parent_id: input.parent_id }),
                ...(input.filter_query !== undefined && { filter_query: input.filter_query }),
                ...(input.filter_lang !== undefined && { filter_lang: input.filter_lang }),
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            items: z.array(ProviderTaskSchema),
            next_cursor: z.string().nullable().optional()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map(mapTask),
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
