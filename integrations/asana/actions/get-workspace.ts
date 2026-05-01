import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace_gid: z.string().describe('Globally unique identifier for the workspace. Example: "123456789"')
});

const WorkspaceSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string(),
    email_domains: z.array(z.string()).optional(),
    is_organization: z.boolean().optional()
});

const AsanaResponseSchema = z.object({
    data: WorkspaceSchema
});

const OutputSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string(),
    email_domains: z.array(z.string()).optional(),
    is_organization: z.boolean().optional()
});

const action = createAction({
    description: 'Fetch a single workspace by gid.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-workspace',
        group: 'Workspaces'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['workspaces:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.asana.com/reference/getworkspace
            endpoint: `/api/1.0/workspaces/${input.workspace_gid}`,
            retries: 3
        });

        const parsed = AsanaResponseSchema.parse(response.data);
        const workspace = parsed.data;

        return {
            gid: workspace.gid,
            resource_type: workspace.resource_type,
            name: workspace.name,
            ...(workspace.email_domains !== undefined && { email_domains: workspace.email_domains }),
            ...(workspace.is_organization !== undefined && { is_organization: workspace.is_organization })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
