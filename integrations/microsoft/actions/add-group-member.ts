import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().min(1).describe('The ID of the group to add a member to. Example: "51d82e22-a356-4506-afa1-2c3992bed3d7"'),
    memberId: z.string().min(1).describe('The ID of the user, group, or service principal to add as a member. Example: "9fc4580d-5ed8-46c5-9fff-258fd68d533d"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    groupId: z.string(),
    memberId: z.string()
});

const action = createAction({
    description: 'Add a member (user, group, or service principal) to a group in Microsoft.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/add-group-member',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Group.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/group-post-members
        await nango.post({
            endpoint: `/v1.0/groups/${encodeURIComponent(input.groupId)}/members/$ref`,
            data: {
                '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${encodeURIComponent(input.memberId)}`
            },
            retries: 3
        });

        return {
            success: true,
            groupId: input.groupId,
            memberId: input.memberId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
