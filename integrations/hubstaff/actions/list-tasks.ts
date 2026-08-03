import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.string().describe('Project ID. Example: "4145631"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderTaskSchema = z
    .object({
        id: z.number(),
        status: z.string(),
        project_id: z.number(),
        project_type: z.string().optional(),
        summary: z.string(),
        lock_version: z.number().optional(),
        assignee_ids: z.array(z.number()).optional(),
        metadata: z.object({}).passthrough().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const TaskSchema = z.object({
    id: z.number(),
    status: z.string(),
    project_id: z.number(),
    project_type: z.string().optional(),
    summary: z.string(),
    lock_version: z.number().optional(),
    assignee_ids: z.array(z.number()).optional(),
    metadata: z.object({}).passthrough().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    tasks: z.array(TaskSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List tasks in a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.hubstaff.com/
        const response = await nango.get({
            endpoint: `v2/projects/${encodeURIComponent(input.projectId)}/tasks`,
            params: {
                ...(input.cursor !== undefined && { page_start_id: input.cursor })
            },
            retries: 3
        });

        const ArrayResponseSchema = z.array(z.unknown());
        const ObjectResponseSchema = z.object({
            tasks: z.array(z.unknown()),
            pagination: z.object({ next_page_start_id: z.union([z.string(), z.number()]).optional() }).optional()
        });
        const ResponseSchema = z.union([ArrayResponseSchema, ObjectResponseSchema]);
        const parsedResponse = ResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Hubstaff API.'
            });
        }

        const taskArray = Array.isArray(parsedResponse.data) ? parsedResponse.data : parsedResponse.data.tasks;
        const nextCursor =
            !Array.isArray(parsedResponse.data) && parsedResponse.data.pagination?.next_page_start_id !== undefined
                ? String(parsedResponse.data.pagination.next_page_start_id)
                : undefined;

        const tasks = taskArray.map((task: unknown) => {
            const parsed = ProviderTaskSchema.safeParse(task);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse task from Hubstaff API.',
                    details: parsed.error.issues
                });
            }

            const t = parsed.data;
            return {
                id: t.id,
                status: t.status,
                project_id: t.project_id,
                ...(t.project_type !== undefined && { project_type: t.project_type }),
                summary: t.summary,
                ...(t.lock_version !== undefined && { lock_version: t.lock_version }),
                ...(t.assignee_ids !== undefined && { assignee_ids: t.assignee_ids }),
                ...(t.metadata !== undefined && { metadata: t.metadata }),
                ...(t.created_at !== undefined && { created_at: t.created_at }),
                ...(t.updated_at !== undefined && { updated_at: t.updated_at })
            };
        });

        return {
            tasks,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
