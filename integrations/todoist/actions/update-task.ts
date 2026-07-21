import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_id: z.string().describe('Task ID. Example: "6h78Phpj8jH59jWq"'),
    content: z.string().optional().describe('Updated task content.'),
    description: z.string().optional().describe('Updated task description.'),
    labels: z.array(z.string()).optional().describe('Updated list of label names.'),
    priority: z.number().int().min(1).max(4).optional().describe('Updated task priority (1=normal, 4=urgent).'),
    due_string: z.string().optional().describe('Human-readable due date.'),
    due_date: z.string().optional().describe('Due date in YYYY-MM-DD format.'),
    due_datetime: z.string().optional().describe('Due date and time in RFC 3339 format.'),
    due_lang: z.string().optional().describe('Language code for due date parsing.'),
    duration: z.number().int().nullable().optional().describe('Task duration amount, or null to clear.'),
    duration_unit: z.enum(['minute', 'day']).nullable().optional().describe('Duration unit (minute or day), or null to clear.'),
    deadline_date: z.string().nullable().optional().describe('Deadline date in YYYY-MM-DD format, or null to clear.')
});

const DueSchema = z.object({
    date: z.string().optional(),
    is_recurring: z.boolean().optional(),
    lang: z.string().optional(),
    string: z.string().optional()
});

const DeadlineSchema = z.object({
    date: z.string().optional(),
    lang: z.string().optional()
});

const DurationSchema = z.object({
    amount: z.number().int().optional(),
    unit: z.string().optional()
});

const ProviderTaskSchema = z.object({
    id: z.string(),
    content: z.string(),
    description: z.string().nullish(),
    labels: z.array(z.string()).nullish(),
    priority: z.number().int().optional(),
    due: DueSchema.optional().nullable(),
    deadline: DeadlineSchema.optional().nullable(),
    duration: DurationSchema.optional().nullable(),
    project_id: z.string().optional(),
    section_id: z.string().nullish(),
    parent_id: z.string().nullish(),
    checked: z.boolean().optional(),
    is_deleted: z.boolean().optional(),
    is_collapsed: z.boolean().optional(),
    child_order: z.number().int().optional(),
    day_order: z.number().int().optional(),
    added_at: z.string().optional(),
    updated_at: z.string().optional(),
    completed_at: z.string().nullish()
});

const OutputSchema = z.object({
    id: z.string(),
    content: z.string(),
    description: z.string().optional(),
    labels: z.array(z.string()).optional(),
    priority: z.number().int().optional(),
    due: DueSchema.optional().nullable(),
    deadline: DeadlineSchema.optional().nullable(),
    duration: DurationSchema.optional().nullable(),
    project_id: z.string().optional(),
    section_id: z.string().optional(),
    parent_id: z.string().optional(),
    checked: z.boolean().optional(),
    is_deleted: z.boolean().optional(),
    is_collapsed: z.boolean().optional(),
    child_order: z.number().int().optional(),
    day_order: z.number().int().optional(),
    added_at: z.string().optional(),
    updated_at: z.string().optional(),
    completed_at: z.string().optional()
});

const action = createAction({
    description: "Update a task's fields (content, description, labels, due date, priority, deadline, duration).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data = {
            ...(input.content !== undefined && { content: input.content }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.labels !== undefined && { labels: input.labels }),
            ...(input.priority !== undefined && { priority: input.priority }),
            ...(input.due_string !== undefined && { due_string: input.due_string }),
            ...(input.due_date !== undefined && { due_date: input.due_date }),
            ...(input.due_datetime !== undefined && { due_datetime: input.due_datetime }),
            ...(input.due_lang !== undefined && { due_lang: input.due_lang }),
            ...(input.duration !== undefined && { duration: input.duration }),
            ...(input.duration_unit !== undefined && { duration_unit: input.duration_unit }),
            ...(input.deadline_date !== undefined && { deadline_date: input.deadline_date })
        };

        const response = await nango.post({
            // https://developer.todoist.com/api/v1/#tag/Tasks/operation/postUpdate_Task
            endpoint: `/api/v1/tasks/${encodeURIComponent(input.task_id)}`,
            data,
            retries: 3
        });

        const providerTask = ProviderTaskSchema.parse(response.data);

        return {
            id: providerTask.id,
            content: providerTask.content,
            ...(providerTask.description !== undefined && providerTask.description !== null && { description: providerTask.description }),
            ...(providerTask.labels !== undefined && providerTask.labels !== null && { labels: providerTask.labels }),
            ...(providerTask.priority !== undefined && { priority: providerTask.priority }),
            ...(providerTask.due !== undefined && providerTask.due !== null && { due: providerTask.due }),
            ...(providerTask.deadline !== undefined && providerTask.deadline !== null && { deadline: providerTask.deadline }),
            ...(providerTask.duration !== undefined && providerTask.duration !== null && { duration: providerTask.duration }),
            ...(providerTask.project_id !== undefined && { project_id: providerTask.project_id }),
            ...(providerTask.section_id !== undefined && providerTask.section_id !== null && { section_id: providerTask.section_id }),
            ...(providerTask.parent_id !== undefined && providerTask.parent_id !== null && { parent_id: providerTask.parent_id }),
            ...(providerTask.checked !== undefined && { checked: providerTask.checked }),
            ...(providerTask.is_deleted !== undefined && { is_deleted: providerTask.is_deleted }),
            ...(providerTask.is_collapsed !== undefined && { is_collapsed: providerTask.is_collapsed }),
            ...(providerTask.child_order !== undefined && { child_order: providerTask.child_order }),
            ...(providerTask.day_order !== undefined && { day_order: providerTask.day_order }),
            ...(providerTask.added_at !== undefined && { added_at: providerTask.added_at }),
            ...(providerTask.updated_at !== undefined && { updated_at: providerTask.updated_at }),
            ...(providerTask.completed_at !== undefined && providerTask.completed_at !== null && { completed_at: providerTask.completed_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
