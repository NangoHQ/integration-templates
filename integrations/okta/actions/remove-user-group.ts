import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('The unique identifier of the Okta group. Example: "00g14y5q5vaoT7IXb698"'),
    userId: z.string().describe('The unique identifier of the Okta user. Example: "00u14y5oijeYKVDn0698"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Remove a user from a group',
    version: '2.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.groups.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developer.okta.com/docs/reference/api/groups/#remove-user-from-group
            endpoint: `/api/v1/groups/${encodeURIComponent(input.groupId)}/users/${encodeURIComponent(input.userId)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
