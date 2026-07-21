import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    since: z.string().describe('Start of the completion date range in ISO 8601 format. Example: "2026-01-01T00:00:00Z"'),
    until: z.string().describe('End of the completion date range in ISO 8601 format. Example: "2026-01-31T23:59:59Z"'),
    workspace_id: z.string().optional().describe('Workspace ID to filter by.'),
    project_id: z.string().optional().describe('Project ID to filter by.'),
    section_id: z.string().optional().describe('Section ID to filter by.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().optional().describe('Maximum number of items to return per page.')
});

const ProviderDueSchema = z.object({
    string: z.string().optional(),
    date: z.string().optional(),
    is_recurring: z.boolean().optional(),
    datetime: z.string().nullable().optional(),
    timezone: z.string().nullable().optional()
});

const ProviderDurationSchema = z.object({
    amount: z.number().int(),
    unit: z.string()
});

const ProviderDeadlineSchema = z.object({
    date: z.string().optional()
});

const ProviderCompletedTaskSchema = z.object({
    user_id: z.string(),
    id: z.string(),
    project_id: z.string(),
    section_id: z.string().nullable().optional(),
    parent_id: z.string().nullable().optional(),
    added_by_uid: z.string().nullable().optional(),
    assigned_by_uid: z.string().nullable().optional(),
    responsible_uid: z.string().nullable().optional(),
    labels: z.array(z.string()),
    deadline: z.union([ProviderDeadlineSchema, z.null()]).optional(),
    duration: z.union([ProviderDurationSchema, z.null()]).optional(),
    checked: z.boolean(),
    is_deleted: z.boolean(),
    added_at: z.string().nullable().optional(),
    completed_at: z.string().nullable().optional(),
    completed_by_uid: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    due: z.union([ProviderDueSchema, z.null()]).optional(),
    priority: z.number().int(),
    child_order: z.number().int(),
    content: z.string(),
    description: z.string(),
    note_count: z.number().int(),
    day_order: z.number().int(),
    is_collapsed: z.boolean()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderCompletedTaskSchema),
    next_cursor: z.string().nullable().optional()
});

const DueSchema = z
    .object({
        string: z.string().optional(),
        date: z.string().optional(),
        is_recurring: z.boolean().optional(),
        datetime: z.string().optional(),
        timezone: z.string().optional()
    })
    .optional();

const DurationSchema = z
    .object({
        amount: z.number().int(),
        unit: z.string()
    })
    .optional();

const DeadlineSchema = z
    .object({
        date: z.string().optional()
    })
    .optional();

const CompletedTaskSchema = z.object({
    user_id: z.string(),
    id: z.string(),
    project_id: z.string(),
    section_id: z.string().optional(),
    parent_id: z.string().optional(),
    added_by_uid: z.string().optional(),
    assigned_by_uid: z.string().optional(),
    responsible_uid: z.string().optional(),
    labels: z.array(z.string()),
    deadline: DeadlineSchema,
    duration: DurationSchema,
    checked: z.boolean(),
    is_deleted: z.boolean(),
    added_at: z.string().optional(),
    completed_at: z.string().optional(),
    completed_by_uid: z.string().optional(),
    updated_at: z.string().optional(),
    due: DueSchema,
    priority: z.number().int(),
    child_order: z.number().int(),
    content: z.string(),
    description: z.string(),
    note_count: z.number().int(),
    day_order: z.number().int(),
    is_collapsed: z.boolean()
});

const OutputSchema = z.object({
    items: z.array(CompletedTaskSchema),
    next_cursor: z.string().optional()
});

function mapDue(due: z.infer<typeof ProviderDueSchema> | null | undefined): z.infer<typeof DueSchema> {
    if (due === undefined || due === null) {
        return undefined;
    }
    return {
        ...(due.string !== undefined && due.string !== null && { string: due.string }),
        ...(due.date !== undefined && due.date !== null && { date: due.date }),
        ...(due.is_recurring !== undefined && due.is_recurring !== null && { is_recurring: due.is_recurring }),
        ...(due.datetime !== undefined && due.datetime !== null && { datetime: due.datetime }),
        ...(due.timezone !== undefined && due.timezone !== null && { timezone: due.timezone })
    };
}

const action = createAction({
    description: 'List tasks completed within a date range, filtered by when they were completed.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: {
            since: string;
            until: string;
            workspace_id?: string;
            project_id?: string;
            section_id?: string;
            cursor?: string;
            limit?: number;
        } = {
            since: input.since,
            until: input.until
        };

        if (input.workspace_id !== undefined) {
            params.workspace_id = input.workspace_id;
        }

        if (input.project_id !== undefined) {
            params.project_id = input.project_id;
        }

        if (input.section_id !== undefined) {
            params.section_id = input.section_id;
        }

        if (input.cursor !== undefined) {
            params.cursor = input.cursor;
        }

        if (input.limit !== undefined) {
            params.limit = input.limit;
        }

        const response = await nango.get({
            // https://developer.todoist.com/api/v1/#get-tasks-completed-by-completion-date
            endpoint: '/api/v1/tasks/completed/by_completion_date',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.items.map((item) => ({
            user_id: item.user_id,
            id: item.id,
            project_id: item.project_id,
            ...(item.section_id !== undefined && item.section_id !== null && { section_id: item.section_id }),
            ...(item.parent_id !== undefined && item.parent_id !== null && { parent_id: item.parent_id }),
            ...(item.added_by_uid !== undefined && item.added_by_uid !== null && { added_by_uid: item.added_by_uid }),
            ...(item.assigned_by_uid !== undefined && item.assigned_by_uid !== null && { assigned_by_uid: item.assigned_by_uid }),
            ...(item.responsible_uid !== undefined && item.responsible_uid !== null && { responsible_uid: item.responsible_uid }),
            labels: item.labels,
            ...(item.deadline !== undefined && item.deadline !== null && { deadline: item.deadline }),
            ...(item.duration !== undefined && item.duration !== null && { duration: item.duration }),
            checked: item.checked,
            is_deleted: item.is_deleted,
            ...(item.added_at !== undefined && item.added_at !== null && { added_at: item.added_at }),
            ...(item.completed_at !== undefined && item.completed_at !== null && { completed_at: item.completed_at }),
            ...(item.completed_by_uid !== undefined && item.completed_by_uid !== null && { completed_by_uid: item.completed_by_uid }),
            ...(item.updated_at !== undefined && item.updated_at !== null && { updated_at: item.updated_at }),
            ...(item.due !== undefined && item.due !== null && { due: mapDue(item.due) }),
            priority: item.priority,
            child_order: item.child_order,
            content: item.content,
            description: item.description,
            note_count: item.note_count,
            day_order: item.day_order,
            is_collapsed: item.is_collapsed
        }));

        return {
            items,
            ...(typeof providerResponse.next_cursor === 'string' && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
