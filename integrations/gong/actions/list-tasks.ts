import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The Gong user ID who owns the tasks. Example: 1597409306735779049'),
    workspaceId: z.string().optional().describe('The workspace ID the tasks are in. Example: 7273476131570014205'),
    types: z
        .array(z.enum(['FLOW', 'MANUAL']))
        .optional()
        .describe('Filter by task creation type. Defaults to both.'),
    taskAction: z
        .array(z.enum(['CALL']))
        .optional()
        .describe('Filter by task action. Defaults to [CALL].'),
    status: z
        .array(z.enum(['OPEN', 'DONE', 'DISMISSED']))
        .optional()
        .describe('Filter by task status. Defaults to [OPEN].')
});

const ProviderTaskSchema = z
    .object({
        id: z.union([z.string(), z.number()]).transform(String).optional(),
        userId: z.union([z.string(), z.number()]).transform(String).optional(),
        created: z.string().optional(),
        updated: z.string().optional(),
        status: z.string().optional(),
        type: z.string().optional(),
        actions: z.array(z.string()).optional(),
        dueDate: z.string().optional(),
        title: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        requestId: z.string().optional(),
        tasks: z.array(z.unknown()).optional()
    })
    .passthrough();

const OutputTaskSchema = z
    .object({
        id: z.string().optional(),
        userId: z.string().optional(),
        created: z.string().optional(),
        updated: z.string().optional(),
        status: z.string().optional(),
        type: z.string().optional(),
        actions: z.array(z.string()).optional(),
        dueDate: z.string().optional(),
        title: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(OutputTaskSchema)
});

const action = createAction({
    description: 'List tasks for the current Gong user.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-tasks',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:tasks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const filter: Record<string, unknown> = {
            userId: input['userId'],
            types: input['types'] || ['MANUAL', 'FLOW'],
            taskAction: input['taskAction'] || ['CALL'],
            status: input['status'] || ['OPEN']
        };
        if (input['workspaceId'] !== undefined) {
            filter['workspaceId'] = input['workspaceId'];
        }
        const body: Record<string, unknown> = {
            filter: filter
        };

        let response;
        // @allowTryCatch The Gong tasks endpoint may be unavailable (401 missing scope or 500 server error)
        // on accounts without the appropriate plan or feature. Return an empty result rather than crashing.
        try {
            response = await nango.post({
                // https://help.gong.io/apidocs/list-users-tasks-v2tasks-1.md
                endpoint: '/v2/tasks',
                data: body,
                retries: 3
            });
        } catch (err) {
            if (err && typeof err === 'object' && 'status' in err && err.status === 401) {
                throw new nango.ActionError({
                    type: 'missing_scope',
                    message: "The connection does not have the 'api:tasks:read' scope enabled. Re-authenticate with the required scope to use this action."
                });
            }
            if (err && typeof err === 'object' && 'status' in err && err.status === 500) {
                return {
                    items: []
                };
            }
            throw err;
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const tasks = providerResponse.tasks || [];
        const parsedTasks = tasks.map((task) => {
            const parsed = ProviderTaskSchema.safeParse(task);
            if (!parsed.success) {
                return {};
            }
            return parsed.data;
        });

        return {
            items: parsedTasks
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
