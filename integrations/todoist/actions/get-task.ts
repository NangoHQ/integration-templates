import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_id: z.string().describe('Task ID. Example: "6h78Phpj8jH59jWq"')
});

const ProviderTaskSchema = z.object({
    id: z.string(),
    content: z.string(),
    description: z.string().optional(),
    project_id: z.string(),
    section_id: z.string().nullable().optional(),
    parent_id: z.string().nullable().optional(),
    checked: z.boolean().optional(),
    labels: z.array(z.string()).optional(),
    priority: z.number().optional(),
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

const OutputSchema = z.object({
    id: z.string(),
    content: z.string(),
    description: z.string().optional(),
    project_id: z.string(),
    section_id: z.string().optional(),
    parent_id: z.string().optional(),
    checked: z.boolean().optional(),
    labels: z.array(z.string()).optional(),
    priority: z.number().optional(),
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

const action = createAction({
    description: 'Retrieve a single task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.todoist.com/api/v1/#get-task
            endpoint: `/api/v1/tasks/${encodeURIComponent(input.task_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Task not found',
                task_id: input.task_id
            });
        }

        const task = ProviderTaskSchema.parse(response.data);

        return {
            id: task.id,
            content: task.content,
            ...(task.description !== undefined && { description: task.description }),
            project_id: task.project_id,
            ...(task.section_id != null && { section_id: task.section_id }),
            ...(task.parent_id != null && { parent_id: task.parent_id }),
            ...(task.checked !== undefined && { checked: task.checked }),
            ...(task.labels !== undefined && { labels: task.labels }),
            ...(task.priority !== undefined && { priority: task.priority }),
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
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
