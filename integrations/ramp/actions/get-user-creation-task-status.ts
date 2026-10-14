import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        task_id: z.string().describe('ID of the deferred task returned by the create-user-invite action. Example: "2d68eb67-f6eb-4284-8683-7d530c77a5a6".')
    })
    .describe('Input identifying the async user-creation task to poll.');

const UserDeferredTaskSchema = z.object({
    id: z.string().nullish(),
    status: z.string(),
    data: z
        .object({
            user_id: z.string().nullish(),
            error: z.string().nullish()
        })
        .nullish(),
    context: z
        .object({
            acting_user_id: z.string().nullish()
        })
        .nullish()
});

const OutputSchema = z
    .object({
        task_id: z.string().describe('ID of the deferred task that was polled.'),
        status: z.string().describe('Current status of the deferred task: STARTED, IN_PROGRESS, ERROR, or SUCCESS.'),
        user_id: z.string().optional().describe('ID of the newly created user. Only present once status is SUCCESS.'),
        error: z.string().optional().describe('Error message explaining why the task failed. Only present when status is ERROR.'),
        acting_user_id: z.string().optional().describe('ID of the user who initiated the deferred task.')
    })
    .describe('Current status of the async user-creation task, including the new user ID once the task succeeds.');

/**
 * @tags: [read]
 * @tagReason: Read-only lookup of an async user-creation task's status; it does not create, modify, or delete any provider resource.
 * @pitfalls: This polls an asynchronous task, so a single call can still return STARTED or IN_PROGRESS, user_id only appears once status is SUCCESS, and a failed task reports status ERROR with an error message instead of a user_id.
 */
const action = createAction({
    description: 'Poll the async task created by create-user-invite to retrieve the new user ID once ready.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    // Ramp requires users:write (not users:read) for GET /developer/v1/users/deferred/status/{task_id}.
    scopes: ['users:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.ramp.com/openapi/developer-api.json - GET /developer/v1/users/deferred/status/{task_id}
        const response = await nango.get({
            endpoint: `/developer/v1/users/deferred/status/${encodeURIComponent(input.task_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'The deferred task could not be found.',
                task_id: input.task_id
            });
        }

        const task = UserDeferredTaskSchema.parse(response.data);

        return {
            task_id: task.id != null ? task.id : input.task_id,
            status: task.status,
            ...(task.data?.user_id != null && { user_id: task.data.user_id }),
            ...(task.data?.error != null && { error: task.data.error }),
            ...(task.context?.acting_user_id != null && { acting_user_id: task.context.acting_user_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
