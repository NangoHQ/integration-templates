import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The team member ID of the user to delete. Example: "dbmid:abc123"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Deletes a user in Dropbox. Requires Dropbox Business.',
    version: '2.0.0',

    endpoint: {
        method: 'DELETE',
        path: '/users',
        group: 'Users'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['members.delete'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/teams#team-members-remove
        await nango.post({
            endpoint: '/2/team/members/remove',
            data: {
                user: {
                    '.tag': 'team_member_id',
                    team_member_id: input.id
                }
            },
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
