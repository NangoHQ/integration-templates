import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).describe('Workspace name. Example: "My Workspace"')
});

const UserSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string()
});

const MemberSchema = z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    role: z.string().optional(),
    user: UserSchema.optional(),
    account_member_id: z.string().optional(),
    permissions: z.array(z.string()).optional()
});

const FormsSchema = z.object({
    count: z.number().optional(),
    href: z.string().optional()
});

const SelfSchema = z.object({
    href: z.string().optional()
});

const ProviderWorkspaceSchema = z.object({
    id: z.string().describe('Workspace ID. Example: "wCjDgv"'),
    name: z.string(),
    account_id: z.string().optional(),
    members: z.array(MemberSchema).optional(),
    forms: z.union([FormsSchema, z.array(FormsSchema)]).optional(),
    self: z.union([SelfSchema, z.array(SelfSchema)]).optional(),
    shared: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    account_id: z.string().optional(),
    members: z.array(MemberSchema).optional(),
    forms: z.union([FormsSchema, z.array(FormsSchema)]).optional(),
    self: z.union([SelfSchema, z.array(SelfSchema)]).optional(),
    shared: z.boolean().optional()
});

const action = createAction({
    description: 'Create a workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['workspaces:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.typeform.com/developers/create/
        const response = await nango.post({
            endpoint: '/workspaces',
            data: {
                name: input.name
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Workspace creation failed: no data returned.'
            });
        }

        const workspace = ProviderWorkspaceSchema.parse(response.data);

        return {
            id: workspace.id,
            name: workspace.name,
            ...(workspace.account_id !== undefined && { account_id: workspace.account_id }),
            ...(workspace.members !== undefined && { members: workspace.members }),
            ...(workspace.forms !== undefined && { forms: workspace.forms }),
            ...(workspace.self !== undefined && { self: workspace.self }),
            ...(workspace.shared !== undefined && { shared: workspace.shared })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
