/**
 * Instructions: Lists tasks.
 * API: https://docs.attio.com/rest-api/endpoint-reference/tasks/list-tasks
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const ListTasksInput = z.object({
    limit: z.number().optional().describe('Maximum number of tasks to return'),
    offset: z.number().optional().describe('Number of tasks to skip')
});

const TaskId = z.object({
    workspace_id: z.string(),
    task_id: z.string()
});

const Task = z.object({
    id: TaskId,
    content_plaintext: z.string(),
    deadline_at: z.union([z.string(), z.null()]),
    is_completed: z.boolean(),
    created_at: z.string()
});

const ListTasksOutput = z.object({
    data: z.array(Task).describe('Array of tasks')
});

const action = createAction({
    description: 'Lists tasks.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/tasks',
        group: 'Tasks'
    },

    input: ListTasksInput,
    output: ListTasksOutput,
    scopes: ['task:read'],

    exec: async (nango, input): Promise<z.infer<typeof ListTasksOutput>> => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/tasks/list-tasks
            endpoint: 'v2/tasks',
            params: {
                ...(input.limit && { limit: input.limit.toString() }),
                ...(input.offset && { offset: input.offset.toString() })
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            data: response.data.data.map((task: any) => ({
                id: {
                    workspace_id: task.id.workspace_id,
                    task_id: task.id.task_id
                },
                content_plaintext: task.content_plaintext,
                deadline_at: task.deadline_at ?? null,
                is_completed: task.is_completed,
                created_at: task.created_at
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
