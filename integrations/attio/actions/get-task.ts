import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_id: z.string().uuid().describe('The ID of the task. Example: "649e34f4-c39a-4f4d-99ef-48a36bef8f04"')
});

const TaskIdSchema = z.object({
    workspace_id: z.string().uuid(),
    task_id: z.string().uuid()
});

const LinkedRecordSchema = z.object({
    target_object_id: z.string(),
    target_record_id: z.string().uuid()
});

const AssigneeSchema = z.object({
    referenced_actor_type: z.string(),
    referenced_actor_id: z.string().uuid()
});

const CreatedByActorSchema = z.object({
    id: z.string().nullable(),
    type: z.string().nullable()
});

const TaskSchema = z.object({
    id: TaskIdSchema,
    content_plaintext: z.string(),
    deadline_at: z.string().nullable(),
    is_completed: z.boolean(),
    completed_at: z.string().nullable(),
    linked_records: z.array(LinkedRecordSchema),
    assignees: z.array(AssigneeSchema),
    created_by_actor: CreatedByActorSchema,
    created_at: z.string()
});

const OutputSchema = TaskSchema;

const action = createAction({
    description: 'Retrieve a single task from Attio.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-task',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['task:read', 'object_configuration:read', 'record_permission:read', 'user_management:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.attio.com/rest-api/endpoint-reference/tasks#get-v2tasks-task-id
            endpoint: `/v2/tasks/${input.task_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Task not found',
                task_id: input.task_id
            });
        }

        const providerResponse = z
            .object({
                data: TaskSchema
            })
            .parse(response.data);

        return providerResponse.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
