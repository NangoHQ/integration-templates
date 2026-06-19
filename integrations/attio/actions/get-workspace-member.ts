import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace_member_id: z.string().describe('The ID of the workspace member to retrieve. Example: "641ecd33-0a48-4b7b-ba48-bbb7a649a8ee"')
});

const WorkspaceMemberIdSchema = z.object({
    workspace_id: z.string(),
    workspace_member_id: z.string()
});

const ProviderWorkspaceMemberSchema = z.object({
    id: WorkspaceMemberIdSchema,
    first_name: z.string(),
    last_name: z.string(),
    avatar_url: z.string().nullable(),
    email_address: z.string(),
    created_at: z.string(),
    access_level: z.enum(['admin', 'member', 'suspended'])
});

const OutputSchema = z.object({
    id: WorkspaceMemberIdSchema,
    first_name: z.string(),
    last_name: z.string(),
    avatar_url: z.string().optional(),
    email_address: z.string(),
    created_at: z.string(),
    access_level: z.enum(['admin', 'member', 'suspended'])
});

const action = createAction({
    description: 'Retrieve a single workspace member from Attio.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_management:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.attio.com/rest-api/endpoint-reference/workspace-members/get-a-workspace-member
        const response = await nango.get({
            endpoint: `/v2/workspace_members/${input.workspace_member_id}`,
            retries: 3
        });

        if (!response.data?.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Workspace member with ID "${input.workspace_member_id}" not found.`,
                workspace_member_id: input.workspace_member_id
            });
        }

        const member = ProviderWorkspaceMemberSchema.parse(response.data.data);

        return {
            id: member.id,
            first_name: member.first_name,
            last_name: member.last_name,
            ...(member.avatar_url !== null && { avatar_url: member.avatar_url }),
            email_address: member.email_address,
            created_at: member.created_at,
            access_level: member.access_level
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
