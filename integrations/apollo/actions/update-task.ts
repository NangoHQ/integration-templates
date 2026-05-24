import { createAction } from 'nango';
import * as z from 'zod';

const InputSchema = z.object({
    id: z
        .string()
        .describe(
            'The Apollo ID of the task to update. This is used for reference only since the original task cannot be modified via OAuth. Example: 6a0af245e3c1270014ee8e23'
        ),
    user_id: z.string().describe('The Apollo user_id for the task owner. Example: 66a3d80d4238fe02d2baaaaf'),
    contact_id: z
        .string()
        .optional()
        .describe(
            'The Apollo contact_id to associate with the task. Either contact_id, account_id, or opportunity_id is required. Example: 6a0af1f3f1ce1100203b8047'
        ),
    account_id: z
        .string()
        .optional()
        .describe('The Apollo account_id to associate with the task. Either contact_id, account_id, or opportunity_id is required.'),
    opportunity_id: z
        .string()
        .optional()
        .describe('The Apollo opportunity_id to associate with the task. Either contact_id, account_id, or opportunity_id is required.'),
    type: z
        .enum([
            'call',
            'outreach_manual_email',
            'linkedin_step_connect',
            'linkedin_step_message',
            'linkedin_step_view_profile',
            'linkedin_step_interact_post',
            'action_item'
        ])
        .describe('The type of task to create.'),
    status: z
        .enum(['scheduled', 'completed', 'skipped'])
        .describe('The status of the task. Use scheduled for future tasks, completed or skipped for past tasks.'),
    due_at: z.string().describe('The due date and time in ISO 8601 format. Apollo uses GMT by default. Example: 2025-02-15T08:10:30Z'),
    priority: z.enum(['high', 'medium', 'low']).optional().describe('The priority of the task. Defaults to medium.'),
    title: z.string().optional().describe('A title for the task. If omitted, Apollo auto-generates a title. Example: Follow up on demo request'),
    note: z.string().optional().describe('A description or note for the task. Example: Discuss product demo results and next steps.')
});

const TaskSchema = z.object({
    id: z.string(),
    user_id: z.string(),
    contact_id: z.string().nullable(),
    account_id: z.string().nullable(),
    opportunity_id: z.string().nullable(),
    type: z.string(),
    status: z.string(),
    priority: z.string(),
    due_at: z.string(),
    title: z.string().nullable(),
    note: z.string().nullable(),
    created_at: z.string()
});

const CreateTaskResponseSchema = z.object({
    task: TaskSchema
});

const OutputSchema = z.object({
    task: TaskSchema,
    original_task_id: z
        .string()
        .describe('The ID of the task that was requested to be updated. Note: The original task still exists and should be manually deleted in the Apollo UI.')
});

type UpdateTaskOutput = z.infer<typeof OutputSchema>;

const action = createAction({
    description:
        'Update a task in Apollo. Note: Due to OAuth limitations, the original task cannot be directly modified or deleted. A new task is created with the updated fields, and the original task should be manually deleted in the Apollo UI.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/update-task' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<UpdateTaskOutput> => {
        const hasAssociation = input.contact_id || input.account_id || input.opportunity_id;
        if (!hasAssociation) {
            throw new nango.ActionError({
                message: 'At least one of contact_id, account_id, or opportunity_id is required to create a task.'
            });
        }

        const requestBody: Record<string, unknown> = {
            user_id: input.user_id,
            type: input.type,
            status: input.status,
            due_at: input.due_at
        };

        if (input.contact_id) {
            requestBody['contact_id'] = input.contact_id;
        }
        if (input.account_id) {
            requestBody['account_id'] = input.account_id;
        }
        if (input.opportunity_id) {
            requestBody['opportunity_id'] = input.opportunity_id;
        }
        if (input.priority) {
            requestBody['priority'] = input.priority;
        }
        if (input.title) {
            requestBody['title'] = input.title;
        }
        if (input.note) {
            requestBody['note'] = input.note;
        }

        // https://docs.apollo.io/reference/create-a-task
        const response = await nango.post({
            endpoint: '/v1/tasks',
            data: requestBody,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                message: 'Invalid response from Apollo API: expected object'
            });
        }

        const parseResult = CreateTaskResponseSchema.safeParse(response.data);
        if (!parseResult.success) {
            throw new nango.ActionError({
                message: 'Invalid response from Apollo API: failed to parse task data',
                details: parseResult.error.issues
            });
        }

        const task = parseResult.data.task;

        return {
            task,
            original_task_id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
