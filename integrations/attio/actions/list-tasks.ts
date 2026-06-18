import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        limit: z.number().optional().describe('The maximum number of results to return. Defaults to 500.'),
        offset: z.number().optional().describe('The number of results to skip over before returning. Defaults to 0.'),
        sort: z.enum(['created_at:asc', 'created_at:desc', 'completed_at:asc', 'completed_at:desc']).optional().describe('Optionally sort the results.'),
        linked_object: z
            .string()
            .optional()
            .describe('Filter tasks by the object slug of linked records (e.g. people). Must be provided with linked_record_id.'),
        linked_record_id: z.string().optional().describe('Filter tasks by the record ID of linked records. Must be provided with linked_object.'),
        assignee: z.string().nullable().optional().describe('Filter tasks by workspace member assignee (email or ID). Pass null for unassigned tasks.'),
        is_completed: z.boolean().optional().describe('Filter tasks by completion status.')
    })
    .superRefine((data, ctx) => {
        const hasLinkedObject = data.linked_object !== undefined;
        const hasLinkedRecordId = data.linked_record_id !== undefined;
        if (hasLinkedObject !== hasLinkedRecordId) {
            ctx.addIssue({
                code: 'custom',
                message: 'linked_object and linked_record_id must both be provided together or both omitted.'
            });
        }
    });

const TaskIdSchema = z.object({
    workspace_id: z.string(),
    task_id: z.string()
});

const LinkedRecordSchema = z.object({
    target_object_id: z.string(),
    target_record_id: z.string()
});

const AssigneeSchema = z.object({
    referenced_actor_type: z.string(),
    referenced_actor_id: z.string()
});

const CreatedByActorSchema = z.object({
    id: z.string().nullable().optional(),
    type: z.string().nullable().optional()
});

const TaskSchema = z.object({
    id: TaskIdSchema,
    content_plaintext: z.string(),
    deadline_at: z.string().nullable().optional(),
    is_completed: z.boolean(),
    completed_at: z.string().nullable().optional(),
    linked_records: z.array(LinkedRecordSchema),
    assignees: z.array(AssigneeSchema),
    created_by_actor: CreatedByActorSchema,
    created_at: z.string()
});

const OutputSchema = z.object({
    data: z.array(TaskSchema),
    next_offset: z.number().optional().describe('The offset to use for the next page of results, if available.')
});

const action = createAction({
    description: 'List tasks from Attio.',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['task:read', 'object_configuration:read', 'record_permission:read', 'user_management:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.limit !== undefined) {
            params['limit'] = input.limit.toString();
        }
        if (input.offset !== undefined) {
            params['offset'] = input.offset.toString();
        }
        if (input.sort !== undefined) {
            params['sort'] = input.sort;
        }
        if (input.linked_object !== undefined) {
            params['linked_object'] = input.linked_object;
        }
        if (input.linked_record_id !== undefined) {
            params['linked_record_id'] = input.linked_record_id;
        }
        if (input.assignee !== undefined) {
            params['assignee'] = input.assignee === null ? 'null' : input.assignee;
        }
        if (input.is_completed !== undefined) {
            params['is_completed'] = input.is_completed.toString();
        }

        const response = await nango.get({
            // https://docs.attio.com/rest-api/endpoint-reference/tasks/list-tasks
            endpoint: 'v2/tasks',
            params,
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z.array(z.unknown())
            })
            .parse(response.data);

        const tasks = providerResponse.data.map((item) => {
            return TaskSchema.parse(item);
        });

        const limit = input.limit ?? 500;
        const nextOffset = tasks.length === limit ? (input.offset ?? 0) + limit : undefined;

        return {
            data: tasks,
            ...(nextOffset !== undefined && { next_offset: nextOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
