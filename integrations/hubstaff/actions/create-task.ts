import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('Project ID. Example: 4145631'),
    summary: z.string().describe('Task summary. Example: "Review Q3 report"'),
    assignee_id: z.number().describe('User ID to assign the task to. Example: 4453817'),
    description: z.string().optional().describe('Optional task description.')
});

const ProviderTaskSchema = z
    .object({
        id: z.number(),
        summary: z.string(),
        description: z.string().nullable().optional(),
        status: z.string().optional(),
        project_id: z.number().optional(),
        project_type: z.string().optional(),
        assignee_ids: z.array(z.number()).optional(),
        metadata: z.object({}).passthrough().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        lock_version: z.number().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    task: ProviderTaskSchema
});

const OutputSchema = z.object({
    id: z.number(),
    summary: z.string(),
    description: z.string().optional(),
    status: z.string().optional(),
    project_id: z.number().optional(),
    project_type: z.string().optional(),
    assignee_ids: z.array(z.number()).optional(),
    metadata: z.object({}).passthrough().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    lock_version: z.number().optional()
});

const action = createAction({
    description: 'Create a new task in a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.hubstaff.com/
            endpoint: `v2/projects/${encodeURIComponent(String(input.project_id))}/tasks`,
            data: {
                summary: input.summary,
                assignee_id: input.assignee_id,
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const task = providerResponse.task;

        return {
            id: task.id,
            summary: task.summary,
            ...(task.description != null && { description: task.description }),
            ...(task.status !== undefined && { status: task.status }),
            ...(task.project_id !== undefined && { project_id: task.project_id }),
            ...(task.project_type !== undefined && { project_type: task.project_type }),
            ...(task.assignee_ids !== undefined && { assignee_ids: task.assignee_ids }),
            ...(task.metadata !== undefined && { metadata: task.metadata }),
            ...(task.created_at !== undefined && { created_at: task.created_at }),
            ...(task.updated_at !== undefined && { updated_at: task.updated_at }),
            ...(task.lock_version !== undefined && { lock_version: task.lock_version })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
