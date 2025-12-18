/**
 * Instructions: Creates a task.
 * API: https://docs.attio.com/rest-api/endpoint-reference/tasks/create-a-task
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const LinkedRecord = z.object({
    target_object: z.string().describe('Object type. Example: "people"'),
    target_record_id: z.string().describe('Record ID')
});

const CreateTaskInput = z.object({
    content: z.string()
        .describe('Task description. Example: "Follow up with customer"'),
    deadline: z.string().optional()
        .describe('Due date in ISO format. Example: "2025-12-31T23:59:59.000Z"'),
    assignee_ids: z.array(z.string()).optional()
        .describe('Array of workspace member IDs to assign. Example: ["user-id-123"]'),
    linked_records: z.array(LinkedRecord).optional()
        .describe('Records to link to this task')
});

const TaskId = z.object({
    workspace_id: z.string(),
    task_id: z.string()
});

const CreateTaskOutput = z.object({
    data: z.object({
        id: TaskId,
        content_plaintext: z.string(),
        deadline_at: z.union([z.string(), z.null()]),
        is_completed: z.boolean(),
        created_at: z.string()
    })
});

const action = createAction({
    description: 'Creates a task.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/tasks',
        group: 'Tasks'
    },

    input: CreateTaskInput,
    output: CreateTaskOutput,
    scopes: ['task:read-write'],

    exec: async (nango, input): Promise<z.infer<typeof CreateTaskOutput>> => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/tasks/create-a-task
            endpoint: 'v2/tasks',
            data: {
                data: {
                    format: 'plaintext',
                    content: input.content,
                    ...(input.deadline && { deadline_at: input.deadline }),
                    ...(input.assignee_ids && { assignees: input.assignee_ids.map(id => ({ referenced_actor_type: 'workspace-member', referenced_actor_id: id })) }),
                    ...(input.linked_records && { linked_records: input.linked_records })
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            data: {
                id: {
                    workspace_id: response.data.data.id.workspace_id,
                    task_id: response.data.data.id.task_id
                },
                content_plaintext: response.data.data.content_plaintext,
                deadline_at: response.data.data.deadline_at ?? null,
                is_completed: response.data.data.is_completed,
                created_at: response.data.data.created_at
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
