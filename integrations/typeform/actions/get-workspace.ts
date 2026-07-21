import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace_id: z.string().describe('Workspace ID. Example: "wCjDgv"')
});

const MemberSchema = z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    role: z.string().optional(),
    permissions: z.array(z.string()).optional()
});

const ProviderWorkspaceSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    account_id: z.string().optional(),
    members: z.array(MemberSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    account_id: z.string().optional(),
    members: z.array(MemberSchema).optional()
});

const action = createAction({
    description: 'Retrieve a workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['workspaces:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.typeform.com/developers/create/
            endpoint: `/workspaces/${encodeURIComponent(input.workspace_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Workspace not found',
                workspace_id: input.workspace_id
            });
        }

        const providerWorkspace = ProviderWorkspaceSchema.parse(response.data);

        return {
            id: providerWorkspace.id,
            ...(providerWorkspace.name != null && { name: providerWorkspace.name }),
            ...(providerWorkspace.account_id != null && { account_id: providerWorkspace.account_id }),
            ...(providerWorkspace.members != null && { members: providerWorkspace.members })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
