import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.string().describe('The unique identifier of the team. Example: "12345678-1234-1234-1234-123456789012"'),
    membershipId: z.string().describe('The unique identifier of the team membership. Example: "12345678-1234-1234-1234-123456789012"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    teamId: z.string(),
    membershipId: z.string()
});

const action = createAction({
    description: 'Remove a member from a team.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['TeamMember.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/conversationmember-delete
        await nango.delete({
            endpoint: `/v1.0/teams/${input.teamId}/members/${input.membershipId}`,
            retries: 3
        });

        return {
            success: true,
            teamId: input.teamId,
            membershipId: input.membershipId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
