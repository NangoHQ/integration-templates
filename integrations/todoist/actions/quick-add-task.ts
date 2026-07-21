import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const DueSchema = z.object({
    date: z.string(),
    string: z.string(),
    lang: z.string(),
    is_recurring: z.boolean(),
    timezone: z.string().nullable()
});

const DeadlineSchema = z.object({
    date: z.string(),
    lang: z.string()
});

const DurationSchema = z.object({
    amount: z.number(),
    unit: z.string()
});

const MetaSchema = z.object({
    project: z.tuple([z.string().nullable(), z.string().nullable()]),
    section: z.tuple([z.string().nullable(), z.string().nullable()]),
    assignee: z.tuple([z.string().nullable(), z.string().nullable()]),
    labels: z.record(z.string(), z.string()),
    due: DueSchema.nullable(),
    deadline: DeadlineSchema.nullable()
});

const TaskSchema = z.object({
    id: z.string(),
    content: z.string(),
    description: z.string().optional(),
    project_id: z.string(),
    section_id: z.string().nullish(),
    parent_id: z.string().nullish(),
    labels: z.array(z.string()).nullish(),
    priority: z.number(),
    due: DueSchema.nullish(),
    deadline: DeadlineSchema.nullish(),
    duration: DurationSchema.nullish(),
    is_collapsed: z.boolean().optional(),
    order: z.number().optional(),
    assignee_id: z.string().nullish(),
    assigner_id: z.string().nullish(),
    completed_at: z.string().nullish(),
    creator_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    meta: MetaSchema.nullable().optional()
});

const InputSchema = z.object({
    text: z.string().describe('Natural-language task text. Example: "Buy milk today at 5pm #Shopping @groceries p1"'),
    note: z.string().optional().describe('Optional note to attach as a comment.'),
    reminder: z.string().optional().describe('Optional reminder in natural language.'),
    auto_reminder: z.boolean().optional().describe('Add default reminder when due date has a time.'),
    meta: z.boolean().optional().default(true).describe('Include parsing metadata in response.')
});

const OutputSchema = TaskSchema;

const action = createAction({
    description:
        "Create a task from a single natural-language string (Todoist's quick-add parser: due dates, #project, @label, assignee, priority all parsed from text).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['task:add', 'data:read_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.todoist.com/api/v1/#quick-add-a-task
            endpoint: '/api/v1/tasks/quick',
            data: {
                text: input.text,
                ...(input.note !== undefined && { note: input.note }),
                ...(input.reminder !== undefined && { reminder: input.reminder }),
                ...(input.auto_reminder !== undefined && { auto_reminder: input.auto_reminder }),
                meta: input.meta
            },
            retries: 1
        };

        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Todoist quick-add returned an empty response.'
            });
        }

        const task = TaskSchema.parse(response.data);

        return task;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
