import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspaceId: z.string().describe('Gong workspace ID. Example: "7273476131570014205"')
});

const ProviderWorkspaceSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional()
});

const ProviderListSchema = z.object({
    requestId: z.string().optional(),
    workspaces: z.array(ProviderWorkspaceSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single Gong workspace by ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:workspaces:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://help.gong.io/docs/list-all-company-workspaces
            endpoint: '/v2/workspaces',
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Gong API',
                workspaceId: input.workspaceId
            });
        }

        const providerList = ProviderListSchema.parse(response.data);
        const providerWorkspace = providerList.workspaces.find((workspace) => workspace.id === input.workspaceId);

        if (!providerWorkspace) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Workspace not found',
                workspaceId: input.workspaceId
            });
        }

        return {
            id: providerWorkspace.id,
            ...(providerWorkspace.name !== undefined && { name: providerWorkspace.name }),
            ...(providerWorkspace.description !== undefined && { description: providerWorkspace.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
