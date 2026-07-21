import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_id: z.string().describe('Task ID to move. Example: "6h78PhwG6Mpjx4PH"'),
    project_id: z.string().optional().describe('Destination project ID.'),
    section_id: z.string().optional().describe('Destination section ID.'),
    parent_id: z.string().optional().describe('Destination parent task ID.')
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
            is_recurring: z.boolean().optional()
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
            is_recurring: z.boolean().optional()
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
    description: 'Move a task to a different project, section, or parent task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['task:update'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.project_id && !input.section_id && !input.parent_id) {
            throw new nango.ActionError({
                type: 'missing_destination',
                message: 'At least one of project_id, section_id, or parent_id must be provided.'
            });
        }

        // https://developer.todoist.com/api/v1/#move-a-task
        const response = await nango.post({
            endpoint: `/api/v1/tasks/${encodeURIComponent(input.task_id)}/move`,
            data: {
                ...(input.project_id !== undefined && { project_id: input.project_id }),
                ...(input.section_id !== undefined && { section_id: input.section_id }),
                ...(input.parent_id !== undefined && { parent_id: input.parent_id })
            },
            retries: 3
        });

        const providerTask = ProviderTaskSchema.parse(response.data);

        return {
            id: providerTask.id,
            content: providerTask.content,
            ...(providerTask.description !== undefined && { description: providerTask.description }),
            project_id: providerTask.project_id,
            ...(providerTask.section_id != null && { section_id: providerTask.section_id }),
            ...(providerTask.parent_id != null && { parent_id: providerTask.parent_id }),
            ...(providerTask.checked !== undefined && { checked: providerTask.checked }),
            ...(providerTask.labels !== undefined && { labels: providerTask.labels }),
            ...(providerTask.priority !== undefined && { priority: providerTask.priority }),
            ...(providerTask.note_count !== undefined && { note_count: providerTask.note_count }),
            ...(providerTask.added_at !== undefined && { added_at: providerTask.added_at }),
            ...(providerTask.added_by_uid !== undefined && { added_by_uid: providerTask.added_by_uid }),
            ...(providerTask.responsible_uid != null && { responsible_uid: providerTask.responsible_uid }),
            ...(providerTask.assigned_by_uid != null && { assigned_by_uid: providerTask.assigned_by_uid }),
            ...(providerTask.due != null && {
                due: {
                    ...(providerTask.due.date !== undefined && { date: providerTask.due.date }),
                    ...(providerTask.due.string !== undefined && { string: providerTask.due.string }),
                    ...(providerTask.due.lang !== undefined && { lang: providerTask.due.lang }),
                    ...(providerTask.due.is_recurring !== undefined && { is_recurring: providerTask.due.is_recurring })
                }
            }),
            ...(providerTask.duration != null && {
                duration: {
                    amount: providerTask.duration.amount,
                    unit: providerTask.duration.unit
                }
            }),
            ...(providerTask.deadline != null && {
                deadline: {
                    ...(providerTask.deadline.date !== undefined && { date: providerTask.deadline.date }),
                    ...(providerTask.deadline.lang !== undefined && { lang: providerTask.deadline.lang })
                }
            }),
            ...(providerTask.url !== undefined && { url: providerTask.url }),
            ...(providerTask.is_collapsed !== undefined && { is_collapsed: providerTask.is_collapsed }),
            ...(providerTask.is_deleted !== undefined && { is_deleted: providerTask.is_deleted }),
            ...(providerTask.completed_at != null && { completed_at: providerTask.completed_at }),
            ...(providerTask.completed_by_uid != null && { completed_by_uid: providerTask.completed_by_uid }),
            ...(providerTask.updated_at !== undefined && { updated_at: providerTask.updated_at }),
            ...(providerTask.child_order !== undefined && { child_order: providerTask.child_order }),
            ...(providerTask.day_order !== undefined && { day_order: providerTask.day_order }),
            ...(providerTask.goal_ids !== undefined && { goal_ids: providerTask.goal_ids }),
            ...(providerTask.completed_count !== undefined && { completed_count: providerTask.completed_count }),
            ...(providerTask.postponed_count !== undefined && { postponed_count: providerTask.postponed_count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
