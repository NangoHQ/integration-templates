import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    limit: z.number().min(1).max(100).optional().describe('Maximum number of workspaces to return. Defaults to 10.')
});

const WorkspaceSchema = z.object({
    gid: z.string(),
    name: z.string(),
    resource_type: z.string().optional(),
    is_organization: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(WorkspaceSchema)
});

const action = createAction({
    description: 'Fetch workspaces with a limit (default 10) for the authenticated user, for use when selecting projects to sync.',
    version: '3.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/fetch-workspaces',
        group: 'Workspaces'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['workspaces:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.asana.com/reference/getworkspaces
        const response = await nango.get({
            endpoint: '/api/1.0/workspaces',
            params: {
                limit: input.limit ?? 10,
                opt_fields: 'gid,name,resource_type,is_organization'
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z.array(z.unknown())
            })
            .safeParse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Asana API: could not parse workspaces data.'
            });
        }

        // can't do a lookup of the protected "Personal Projects" workspace
        const items = providerResponse.data.data.map((item) => WorkspaceSchema.parse(item)).filter((workspace) => workspace.name !== 'Personal Projects');

        return { items };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
