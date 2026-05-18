import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderWorkspaceMemberIdSchema = z.object({
    workspace_id: z.string(),
    workspace_member_id: z.string()
});

const ProviderWorkspaceMemberSchema = z.object({
    id: ProviderWorkspaceMemberIdSchema,
    first_name: z.string(),
    last_name: z.string(),
    avatar_url: z.string().nullable(),
    email_address: z.string(),
    created_at: z.string(),
    access_level: z.enum(['admin', 'member', 'suspended'])
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderWorkspaceMemberSchema)
});

const WorkspaceMemberSchema = z.object({
    workspace_member_id: z.string(),
    workspace_id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    avatar_url: z.string().optional(),
    email_address: z.string(),
    created_at: z.string(),
    access_level: z.string()
});

const OutputSchema = z.object({
    items: z.array(WorkspaceMemberSchema)
});

const action = createAction({
    description: 'List all workspace members in Attio.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-workspace-members',
        group: 'Workspace Members'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_management:read'],

    exec: async (nango, _input) => {
        const response = await nango.get({
            // https://docs.attio.com/rest-api/endpoint-reference/workspace-members
            endpoint: '/v2/workspace_members',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((member) => ({
            workspace_member_id: member.id.workspace_member_id,
            workspace_id: member.id.workspace_id,
            first_name: member.first_name,
            last_name: member.last_name,
            ...(member.avatar_url != null && { avatar_url: member.avatar_url }),
            email_address: member.email_address,
            created_at: member.created_at,
            access_level: member.access_level
        }));

        return {
            items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
