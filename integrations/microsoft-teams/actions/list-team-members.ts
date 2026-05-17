import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.string().describe('Team ID. Example: "ee0f5ae2-8bc6-4ae5-8466-7daeebbfa062"'),
    cursor: z.string().optional().describe('Full @odata.nextLink URL from the previous response. Omit for the first page.')
});

const ProviderMemberSchema = z.object({
    id: z.string(),
    roles: z.array(z.string()).optional(),
    displayName: z.string().optional(),
    userId: z.string().optional(),
    email: z.string().optional(),
    tenantId: z.string().optional()
});

const MemberSchema = z.object({
    id: z.string(),
    roles: z.array(z.string()).optional(),
    displayName: z.string().optional(),
    userId: z.string().optional(),
    email: z.string().optional(),
    tenantId: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(MemberSchema),
    nextCursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(ProviderMemberSchema),
    '@odata.nextLink': z.string().optional()
});

const action = createAction({
    description: 'List members in a team.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-team-members',
        group: 'Teams'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['TeamMember.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/graph/api/team-list-members
            endpoint: input.cursor || `/v1.0/teams/${input.teamId}/members`,
            ...(input.cursor ? {} : { params: { $top: 50 } }),
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.value.map((member) => ({
                id: member.id,
                ...(member.roles !== undefined && { roles: member.roles }),
                ...(member.displayName !== undefined && { displayName: member.displayName }),
                ...(member.userId !== undefined && { userId: member.userId }),
                ...(member.email !== undefined && { email: member.email }),
                ...(member.tenantId !== undefined && { tenantId: member.tenantId })
            })),
            ...(providerResponse['@odata.nextLink'] !== undefined && { nextCursor: providerResponse['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
