import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.string().describe('Team ID to add the member to. Example: "ee0f5ae2-8bc6-4ae5-8466-7daeebbfa062"'),
    userId: z
        .string()
        .describe('User ID or user principal name (UPN) to add as a member. Example: "8b081ef6-4792-4def-b2c9-c363a1bf41d5" or "jacob@contoso.com"'),
    isOwner: z.boolean().optional().describe('Whether to add the user as an owner. Defaults to false (regular member).')
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    '@odata.type': z.string().optional(),
    roles: z.array(z.string()),
    userId: z.string().optional(),
    displayName: z.string().optional(),
    email: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    roles: z.array(z.string()),
    userId: z.string().optional(),
    displayName: z.string().optional(),
    email: z.string().optional()
});

const action = createAction({
    description: 'Add a member to a team',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['TeamMember.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const roles = input.isOwner ? ['owner'] : [];

        // https://learn.microsoft.com/en-us/graph/api/team-post-members
        const response = await nango.post({
            endpoint: `/v1.0/teams/${input.teamId}/members`,
            data: {
                '@odata.type': '#microsoft.graph.aadUserConversationMember',
                roles: roles,
                'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${input.userId}')`
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to add team member: empty response from API'
            });
        }

        const member = ProviderResponseSchema.parse(response.data);

        return {
            id: member.id,
            roles: member.roles,
            ...(member.userId !== undefined && { userId: member.userId }),
            ...(member.displayName !== undefined && { displayName: member.displayName }),
            ...(member.email !== undefined && { email: member.email })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
