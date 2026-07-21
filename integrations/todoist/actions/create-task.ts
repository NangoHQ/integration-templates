import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        content: z.string().describe('Task content. Example: "Buy milk"'),
        description: z.string().optional().describe('Task description. Example: "Pick up organic milk"'),
        project_id: z.string().optional().describe('ID of the project to add the task to. Omit for Inbox. Example: "6h78PW84RjxxRW8q"'),
        section_id: z.string().optional().describe('ID of the section to add the task to. Example: "6h78Pcqxgv66G2rq"'),
        parent_id: z.string().optional().describe('ID of the parent task. Example: "6h78Phpj8jH59jWq"'),
        order: z.number().optional().describe('Position of the task in the project or section'),
        labels: z.array(z.string()).optional().describe('List of label names. Example: ["nango-seed-keep"]'),
        priority: z.number().int().min(1).max(4).optional().describe('Task priority from 1 (normal) to 4 (urgent). UI P1 corresponds to API priority 4.'),
        assignee_id: z.number().optional().describe('ID of the user to assign the task to'),
        due_string: z.string().optional().describe('Human-readable due date. Example: "tomorrow at 10am"'),
        due_date: z.string().optional().describe('Due date in YYYY-MM-DD format'),
        due_datetime: z.string().optional().describe('Due date and time in RFC 3339 format'),
        due_lang: z.string().optional().describe('Language for parsing due_string. Example: "en"'),
        duration: z.number().int().optional().describe('Task duration amount. Must be provided together with duration_unit'),
        duration_unit: z.enum(['minute', 'day']).optional().describe('Unit for duration. Must be provided together with duration'),
        deadline_date: z.string().optional().describe('Deadline date in YYYY-MM-DD format')
    })
    .refine(
        (data) => {
            const hasDuration = data.duration !== undefined;
            const hasDurationUnit = data.duration_unit !== undefined;
            return hasDuration === hasDurationUnit;
        },
        {
            message: 'duration and duration_unit must be provided together',
            path: ['duration']
        }
    );

const OutputSchema = z
    .object({
        id: z.string(),
        user_id: z.string(),
        project_id: z.string(),
        section_id: z.string().nullable().optional(),
        parent_id: z.string().nullable().optional(),
        added_by_uid: z.string(),
        assigned_by_uid: z.string().nullable().optional(),
        responsible_uid: z.string().nullable().optional(),
        labels: z.array(z.string()),
        deadline: z
            .object({
                date: z.string(),
                lang: z.string().optional()
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
        is_collapsed: z.boolean(),
        checked: z.boolean(),
        is_deleted: z.boolean(),
        added_at: z.string(),
        completed_at: z.string().nullable().optional(),
        completed_by_uid: z.string().nullable().optional(),
        updated_at: z.string(),
        due: z
            .object({
                date: z.string(),
                timezone: z.string().nullable().optional(),
                string: z.string(),
                lang: z.string(),
                is_recurring: z.boolean()
            })
            .nullable()
            .optional(),
        priority: z.number(),
        child_order: z.number(),
        content: z.string(),
        description: z.string().nullable().optional(),
        note_count: z.number(),
        day_order: z.number().nullable().optional(),
        goal_ids: z.array(z.string()).nullable().optional(),
        completed_count: z.number().nullable().optional(),
        postponed_count: z.number().nullable().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Create a task',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['task:add'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.todoist.com/api/v1/#tag/Tasks/operation/create_task_api_v1_tasks_post
            endpoint: '/api/v1/tasks',
            data: {
                content: input.content,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.project_id !== undefined && { project_id: input.project_id }),
                ...(input.section_id !== undefined && { section_id: input.section_id }),
                ...(input.parent_id !== undefined && { parent_id: input.parent_id }),
                ...(input.order !== undefined && { order: input.order }),
                ...(input.labels !== undefined && { labels: input.labels }),
                ...(input.priority !== undefined && { priority: input.priority }),
                ...(input.assignee_id !== undefined && { assignee_id: input.assignee_id }),
                ...(input.due_string !== undefined && { due_string: input.due_string }),
                ...(input.due_date !== undefined && { due_date: input.due_date }),
                ...(input.due_datetime !== undefined && { due_datetime: input.due_datetime }),
                ...(input.due_lang !== undefined && { due_lang: input.due_lang }),
                ...(input.duration !== undefined && { duration: input.duration }),
                ...(input.duration_unit !== undefined && { duration_unit: input.duration_unit }),
                ...(input.deadline_date !== undefined && { deadline_date: input.deadline_date })
            },
            retries: 1
        };

        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Failed to create task'
            });
        }

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
