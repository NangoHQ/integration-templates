import { z } from 'zod';
import { createAction } from 'nango';

const ChecklistItemSchema = z.object({
    id: z.string().optional().describe('Identifier of an existing subtask to update. Omit when adding a new subtask.'),
    title: z.string().optional().describe('Subtask title.'),
    status: z.number().int().optional().describe('Subtask completion status: 0 for normal, 1 for completed.'),
    completedTime: z.string().optional().describe('Subtask completion time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format, e.g. "2019-11-13T03:00:00+0000".'),
    isAllDay: z.boolean().optional().describe('Whether the subtask spans the entire day.'),
    sortOrder: z.number().int().optional().describe('Order of the subtask within the task.'),
    startDate: z.string().optional().describe('Subtask start date/time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format, e.g. "2019-11-13T03:00:00+0000".'),
    timeZone: z.string().optional().describe('IANA time zone in which the subtask start time is specified, e.g. "America/Los_Angeles".')
});

const TaskBaseSchema = z.object({
    projectId: z.string().describe('Identifier of the project the task belongs to.'),
    title: z.string().optional().describe('Task title.'),
    content: z.string().optional().describe('Task content (notes).'),
    desc: z.string().optional().describe('Description of the task checklist.'),
    isAllDay: z.boolean().optional().describe('Whether the task spans the entire day.'),
    startDate: z.string().optional().describe('Task start date/time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format, e.g. "2019-11-13T03:00:00+0000".'),
    dueDate: z.string().optional().describe('Task due date/time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format, e.g. "2019-11-14T03:00:00+0000".'),
    timeZone: z.string().optional().describe('IANA time zone in which the task times are specified, e.g. "America/Los_Angeles".'),
    reminders: z.array(z.string()).optional().describe('Reminder triggers, e.g. ["TRIGGER:P0DT9H0M0S", "TRIGGER:PT0S"].'),
    tags: z.array(z.string()).optional().describe('Tags attached to the task, e.g. ["work", "urgent"].'),
    repeatFlag: z.string().optional().describe('Recurrence rule (RRULE), e.g. "RRULE:FREQ=DAILY;INTERVAL=1".'),
    repeatFrom: z
        .string()
        .optional()
        .describe(
            'Recurrence calculation mode when repeatFlag is set: "0" from the original date, "1" from the completion date, "2" from the current date (server default).'
        ),
    priority: z.number().int().optional().describe('Task priority: 0 none, 1 low, 3 medium, 5 high.'),
    sortOrder: z.number().int().optional().describe('Order of the task within its project.'),
    items: z.array(ChecklistItemSchema).optional().describe('Checklist subtasks of the task.'),
    parentId: z.string().optional().describe('Identifier of the parent task; set to an empty string to remove the parent-child relationship.'),
    status: z.number().int().optional().describe('Task completion status: -1 abandoned, 0 normal, 2 completed.'),
    completedTime: z.string().optional().describe('Task completion time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format, e.g. "2019-11-13T03:00:00+0000".'),
    assigneeUsername: z.string().optional().describe('Username of the project member assigned to the task.'),
    kind: z.string().optional().describe('Task kind: "TEXT", "NOTE", or "CHECKLIST".')
});

const AddTaskSchema = TaskBaseSchema.extend({
    title: z.string().describe('Title of the new task.')
});

const UpdateTaskSchema = TaskBaseSchema.extend({
    id: z.string().describe('Identifier of the existing task to update.')
});

const InputSchema = z
    .object({
        add: z.array(AddTaskSchema).max(50).optional().describe('Tasks to create, up to 50 per request.'),
        update: z.array(UpdateTaskSchema).max(50).optional().describe('Tasks to update, up to 50 per request. Provide at least one task across add and update.')
    })
    .describe('A batch of tasks to create and/or update in a single TickTick request.');

const OutputSchema = z
    .object({
        id2etag: z.record(z.string(), z.string()).describe('Map of task ID to the etag the server assigned after the batch write.'),
        id2error: z.record(z.string(), z.string()).describe('Map of task ID to a per-task error code; empty when every task succeeded.')
    })
    .describe('Result of the batch create/update operation, keyed by task ID.');

const ProviderBatchResponseSchema = z.object({
    id2etag: z.record(z.string(), z.string()).optional(),
    id2error: z.record(z.string(), z.string()).optional()
});

/**
 * @tags: [write]
 * @tagReason: Creates new tasks and updates existing tasks in the provider via a single batch write.
 * @pitfalls: Despite the name, tasks in add are always created as new records with no deduplication, so resubmitting the same task duplicates it; updates are partial merges, so omitted fields keep their existing values; and the call can return HTTP 200 even when individual tasks fail, so callers must inspect id2error for per-task codes such as NOT_EXISTED, EXCEED_QUOTA, or permission errors.
 */
const action = createAction({
    description: 'Create and/or update multiple tasks in a single request (up to 50 each).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const add = input.add && input.add.length > 0 ? input.add : undefined;
        const update = input.update && input.update.length > 0 ? input.update : undefined;

        if (!add && !update) {
            throw new nango.ActionError({
                type: 'empty_batch',
                message: 'Provide at least one task in "add" or "update".'
            });
        }

        // https://developer.ticktick.com/docs/openapi.md#batch-create-or-update-tasks
        const response = await nango.post({
            endpoint: '/open/v1/task/batch',
            data: {
                ...(add ? { add } : {}),
                ...(update ? { update } : {})
            },
            // Batch add creates new tasks with no idempotency key, so a retry after a lost response would duplicate tasks.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- retries: 0 is intentional for this non-idempotent write.
            retries: 0
        });

        const parsed = ProviderBatchResponseSchema.parse(response.data);

        return {
            id2etag: parsed.id2etag ?? {},
            id2error: parsed.id2error ?? {}
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
