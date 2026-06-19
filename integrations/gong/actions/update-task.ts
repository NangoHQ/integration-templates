import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    taskId: z.string().describe('The ID of the task to update. Example: "7254376376091929519"'),
    userId: z.string().describe('The Gong user ID who owns the task.'),
    status: z.enum(['OPEN', 'DONE', 'DISMISSED']).optional().describe('New status for the task.'),
    dueDate: z.string().optional().describe('New due date in ISO-8601 format. Example: 2018-02-18T08:00:00Z'),
    priority: z.string().optional().describe('New priority for the task. Example: MEDIUM'),
    notes: z.string().optional().describe('Notes for the task.')
});

const OutputSchema = z.object({
    id: z.string().optional(),
    userId: z.string().optional(),
    status: z.string().optional(),
    dueDate: z.string().optional(),
    priority: z.string().optional(),
    error: z
        .object({
            type: z.string(),
            message: z.string()
        })
        .optional()
});

const HttpErrorSchema = z.object({
    response: z
        .object({
            status: z.number(),
            data: z.unknown().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Update a Gong task for the current user.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            userId: input.userId
        };
        if (input.status !== undefined) {
            body['status'] = input.status;
        }
        if (input.dueDate !== undefined) {
            body['dueDate'] = input.dueDate;
        }
        if (input.priority !== undefined) {
            body['priority'] = input.priority;
        }
        if (input.notes !== undefined) {
            body['notes'] = input.notes;
        }

        // @allowTryCatch: Handle 401 when the tasks scope is missing or 500 when the endpoint is unavailable
        try {
            const response = await nango.patch({
                // https://help.gong.io/docs/what-the-gong-api-provides
                endpoint: `/v2/tasks/${encodeURIComponent(String(input.taskId))}`,
                data: body,
                retries: 3
            });

            if (response.status && response.status >= 400) {
                if (response.status === 401) {
                    return {
                        error: {
                            type: 'missing_scope',
                            message: 'The connection does not have the required tasks scope to update tasks.'
                        }
                    };
                }
                if (response.status === 500) {
                    return {
                        error: {
                            type: 'internal_server_error',
                            message: 'The Gong API returned an internal server error. The tasks endpoint may be unavailable for this account.'
                        }
                    };
                }
                throw new nango.ActionError({
                    type: 'api_error',
                    message: `Unexpected status ${response.status} from the Gong API.`
                });
            }

            const responseData = z
                .object({
                    tasks: z
                        .array(
                            z
                                .object({
                                    id: z.union([z.string(), z.number()]).transform(String),
                                    userId: z.union([z.string(), z.number()]).transform(String),
                                    status: z.string().optional(),
                                    dueDate: z.string().optional(),
                                    priority: z.string().optional()
                                })
                                .passthrough()
                        )
                        .optional()
                })
                .safeParse(response.data);

            if (!responseData.success || !responseData.data.tasks || responseData.data.tasks.length === 0) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected response from the Gong API.'
                });
            }

            const task = responseData.data.tasks[0];
            if (!task) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected response from the Gong API.'
                });
            }

            return {
                id: task.id,
                userId: task.userId,
                ...(task.status !== undefined && { status: task.status }),
                ...(task.dueDate !== undefined && { dueDate: task.dueDate }),
                ...(task.priority !== undefined && { priority: task.priority })
            };
        } catch (error) {
            const parsedError = HttpErrorSchema.safeParse(error);
            if (parsedError.success) {
                const status = parsedError.data.response?.status;
                if (status === 401) {
                    return {
                        error: {
                            type: 'missing_scope',
                            message: 'The connection does not have the required tasks scope to update tasks.'
                        }
                    };
                }
                if (status === 500) {
                    return {
                        error: {
                            type: 'internal_server_error',
                            message: 'The Gong API returned an internal server error. The tasks endpoint may be unavailable for this account.'
                        }
                    };
                }
            }
            throw error;
        }
    }
});

export default action;
