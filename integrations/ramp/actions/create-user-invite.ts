import { z } from 'zod';
import { createAction } from 'nango';

const MAX_POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 1000;
const INITIAL_POLL_DELAY_MS = 2000;

// BUSINESS_OWNER is excluded: Ramp accepts the request but the async task fails with "Owner is not an invitable role for this business".
const RoleSchema = z.enum(['AUDITOR', 'BUSINESS_ADMIN', 'BUSINESS_BOOKKEEPER', 'BUSINESS_USER', 'GUEST_USER', 'IT_ADMIN']);

const InputSchema = z
    .object({
        email: z.string().describe('Email address the invite is sent to. Example: "jane.doe@example.com"'),
        idempotency_key: z
            .string()
            .describe('Client-generated unique key (a random UUID is recommended) that Ramp uses to recognize retries of the same request.'),
        first_name: z.string().describe('First name of the invited employee. Example: "Jane"'),
        last_name: z.string().describe('Last name of the invited employee. Example: "Doe"'),
        role: RoleSchema.describe('Role granted to the employee. Example: "BUSINESS_USER"'),
        department_id: z
            .string()
            .optional()
            .describe('Unique identifier of the department to assign the employee to. Example: "2d68eb67-f6eb-4284-8683-7d530c77a5a6"'),
        location_id: z
            .string()
            .optional()
            .describe('Unique identifier of the location to assign the employee to; also determines the entity the user belongs to.')
    })
    .describe('Input for creating a new Ramp user and triggering an email invite.');

const DeferredTaskSchema = z.object({
    id: z.string()
});

// Same provider shape as get-user-creation-task-status (UserDeferredTask): every field may be omitted or null,
// e.g. a failed task returns data without user_id.
const TaskStatusSchema = z.object({
    id: z.string().nullish(),
    status: z.string().nullish(),
    data: z
        .object({
            user_id: z.string().nullish(),
            error: z.string().nullish()
        })
        .nullish()
});

const UserSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    role: z.string().optional(),
    status: z.string().optional(),
    department_id: z.string().nullable().optional(),
    location_id: z.string().nullable().optional(),
    is_manager: z.boolean().optional()
});

const OutputSchema = z
    .object({
        task_id: z.string().describe('Unique identifier of the async user-creation task that Ramp returned.'),
        user_id: z.string().describe('Unique identifier of the created user. Example: "01a13a02-d3bd-7ce0-81d5-14bd9805388f"'),
        status: z.string().optional().describe('Current status of the created user, e.g. "INVITE_PENDING", "USER_ACTIVE" or "USER_DRAFT".'),
        email: z.string().optional().describe('Email address of the created user.'),
        first_name: z.string().optional().describe('First name of the created user.'),
        last_name: z.string().optional().describe('Last name of the created user.'),
        role: z.string().optional().describe('Role assigned to the created user.'),
        department_id: z.string().nullable().optional().describe('Department the created user belongs to, or null when unassigned.'),
        location_id: z.string().nullable().optional().describe('Location the created user belongs to, or null when unassigned.'),
        is_manager: z.boolean().optional().describe('Whether the created user is a manager.')
    })
    .describe('The created user together with the result of the asynchronous invite task.');

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @tags: [read, write, destructive]
 * @tagReason: Creates a user and sends an irreversible invite email (write, difficult to reverse since users can only be deactivated, never deleted), then reads the async task status and the created user.
 * @pitfalls: The invite is sent asynchronously, so the user starts as "INVITE_PENDING" and only activates after the recipient accepts; the created user cannot be deleted afterwards, only deactivated; a failed async task makes the action throw instead of returning a user; and reusing an idempotency_key that was already used returns an error rather than replaying the original result.
 */
const action = createAction({
    description: 'Create a new user and trigger an async task to send them an email invite.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:write', 'users:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = {
            email: input.email,
            idempotency_key: input.idempotency_key,
            first_name: input.first_name,
            last_name: input.last_name,
            role: input.role,
            ...(input.department_id !== undefined && { department_id: input.department_id }),
            ...(input.location_id !== undefined && { location_id: input.location_id })
        };

        // https://docs.ramp.com/developer-api/v1/api-reference/users/post-users-deferred
        const createResponse = await nango.post({
            endpoint: '/developer/v1/users/deferred',
            data: body,
            // Not replay-safe: resending the same idempotency_key after a lost response is rejected with 400 DEVELOPER_7005
            // "Idempotency key already exists" instead of returning the original task, so retries must stay at 0.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const task = DeferredTaskSchema.parse(createResponse.data);
        const taskId = task.id;

        await sleep(INITIAL_POLL_DELAY_MS);

        let taskStatus: z.infer<typeof TaskStatusSchema> | undefined;
        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
            if (attempt > 0) {
                await sleep(POLL_INTERVAL_MS);
            }
            // https://docs.ramp.com/developer-api/v1/api-reference/users/get-users-deferred-status-task-id
            const statusResponse = await nango.get({
                endpoint: `/developer/v1/users/deferred/status/${encodeURIComponent(taskId)}`,
                retries: 3
            });
            const parsed = TaskStatusSchema.parse(statusResponse.data);
            taskStatus = parsed;
            if (parsed.status === 'SUCCESS' || parsed.status === 'ERROR') {
                break;
            }
        }

        if (taskStatus === undefined) {
            throw new nango.ActionError({
                type: 'task_not_started',
                message: 'The user creation task did not return a status.',
                task_id: taskId
            });
        }

        if (taskStatus.status === 'ERROR') {
            throw new nango.ActionError({
                type: 'user_creation_failed',
                message: taskStatus.data?.error ?? 'Ramp failed to create the user invite.',
                task_id: taskId
            });
        }

        const userId = taskStatus.data?.user_id;
        if (!userId) {
            throw new nango.ActionError({
                type: 'task_incomplete',
                message: 'The user creation task did not finish within the polling window.',
                task_id: taskId,
                ...(taskStatus.status != null && { status: taskStatus.status })
            });
        }

        // https://docs.ramp.com/developer-api/v1/api-reference/users/get-users-user-id
        const userResponse = await nango.get({
            endpoint: `/developer/v1/users/${encodeURIComponent(userId)}`,
            retries: 3
        });

        const user = UserSchema.parse(userResponse.data);

        return {
            task_id: taskId,
            user_id: user.id,
            ...(user.status !== undefined && { status: user.status }),
            ...(user.email !== undefined && { email: user.email }),
            ...(user.first_name !== undefined && { first_name: user.first_name }),
            ...(user.last_name !== undefined && { last_name: user.last_name }),
            ...(user.role !== undefined && { role: user.role }),
            ...(user.department_id !== undefined && { department_id: user.department_id }),
            ...(user.location_id !== undefined && { location_id: user.location_id }),
            ...(user.is_manager !== undefined && { is_manager: user.is_manager })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
