import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const WorkspaceSchema = z.object({
    id: z.string().describe('Gong unique identifier for the workspace. Example: "12345678901234567890"'),
    name: z.string().describe('The name of the workspace. Example: "Sales"'),
    description: z.string().describe('The description of the workspace. Example: "Sales workspace"')
});

const OutputSchema = z.object({
    workspaces: z.array(WorkspaceSchema)
});

const action = createAction({
    description: 'List all workspaces in the Gong account.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-workspaces',
        group: 'Workspaces'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:workspaces:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://help.gong.io/docs/what-the-gong-api-provides
        const response = await nango.get({
            endpoint: '/v2/workspaces',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No workspaces found'
            });
        }

        const data = z
            .object({
                workspaces: z.array(
                    z.object({
                        id: z.string(),
                        name: z.string(),
                        description: z.string()
                    })
                )
            })
            .parse(response.data);

        return {
            workspaces: data.workspaces.map((workspace) => ({
                id: workspace.id,
                name: workspace.name,
                description: workspace.description
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
