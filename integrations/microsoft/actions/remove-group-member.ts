import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().min(1).describe('The ID of the group from which to remove the member. Example: "51d82e22-a356-4506-afa1-2c3992bed3d7"'),
    memberId: z.string().min(1).describe('The ID of the member to remove from the group. Example: "9fc4580d-5ed8-46c5-9fff-258fd68d533d"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Remove a member from a group in Microsoft.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Group.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/group-delete-members
        await nango.delete({
            endpoint: `/v1.0/groups/${encodeURIComponent(input.groupId)}/members/${encodeURIComponent(input.memberId)}/$ref`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
