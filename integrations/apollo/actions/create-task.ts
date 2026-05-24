import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('The ID of the user who owns the task. Example: "6a0af1f0c9f63c0018aed306"'),
    type: z.enum(['action_item', 'call', 'email', 'meeting']).describe('The type of task. Example: "action_item"'),
    priority: z.enum(['low', 'medium', 'high']).describe('The priority of the task. Example: "medium"'),
    due_at: z.string().describe('The due date of the task in ISO 8601 format. Example: "2026-05-20T12:00:00Z"'),
    note: z.string().describe('The note or description for the task. Example: "Follow up with prospect"'),
    contact_id: z.string().optional().describe('The ID of the contact this task is for. Example: "6a0af1f3f1ce1100203b8047"'),
    account_id: z.string().optional().describe('The ID of the account this task is for. Example: "6a0af1f0c9f63c0018aed306"'),
    opportunity_id: z.string().optional().describe('The ID of the opportunity this task is for. Example: "6a0af21285c69e000cc28695"')
});

const TaskSchema = z.object({
    id: z.string(),
    user_id: z.string(),
    type: z.string(),
    priority: z.string(),
    due_at: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    contact_id: z.string().nullable().optional(),
    account_id: z.string().nullable().optional(),
    opportunity_id: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const OutputSchema = z.object({
    task: TaskSchema
});

const action = createAction({
    description: 'Create a task in Apollo',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-task',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const hasContactId = input.contact_id !== undefined && input.contact_id.length > 0;
        const hasAccountId = input.account_id !== undefined && input.account_id.length > 0;
        const hasOpportunityId = input.opportunity_id !== undefined && input.opportunity_id.length > 0;

        if (!hasContactId && !hasAccountId && !hasOpportunityId) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of contact_id, account_id, or opportunity_id is required'
            });
        }

        const requestData: Record<string, unknown> = {
            user_id: input.user_id,
            type: input.type,
            priority: input.priority,
            due_at: input.due_at,
            note: input.note
        };

        if (hasContactId) {
            requestData['contact_id'] = input.contact_id;
        }

        if (hasAccountId) {
            requestData['account_id'] = input.account_id;
        }

        if (hasOpportunityId) {
            requestData['opportunity_id'] = input.opportunity_id;
        }

        // https://docs.apollo.io/reference/create-task
        const response = await nango.post({
            endpoint: '/v1/tasks',
            data: requestData,
            retries: 1
        });

        const responseSchema = z.object({ task: z.record(z.string(), z.unknown()) });
        const providerData = z.parse(responseSchema, response.data);
        const taskRecord = providerData.task;
        const task = TaskSchema.parse(taskRecord);

        return {
            task: {
                id: task.id,
                user_id: task.user_id,
                type: task.type,
                priority: task.priority,
                ...(task.due_at != null && { due_at: task.due_at }),
                ...(task.note != null && { note: task.note }),
                ...(task.contact_id != null && { contact_id: task.contact_id }),
                ...(task.account_id != null && { account_id: task.account_id }),
                ...(task.opportunity_id != null && { opportunity_id: task.opportunity_id }),
                ...(task.created_at != null && { created_at: task.created_at }),
                ...(task.updated_at != null && { updated_at: task.updated_at })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
