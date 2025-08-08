import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { SuccessResponse, IdEntity } from '../models.js';

const action = createAction({
    description: 'Deletes a user in Dropbox. Requires Dropbox Business.',
    version: '2.0.0',

    endpoint: {
        method: 'DELETE',
        path: '/users',
        group: 'Users'
    },

    input: IdEntity,
    output: SuccessResponse,
    scopes: ['members.delete'],

    exec: async (nango, input): Promise<SuccessResponse> => {
        if (!input || !input.id) {
            throw new nango.ActionError({
                message: 'Id is required'
            });
        }

        const config: ProxyConfiguration = {
            // https://www.dropbox.com/developers/documentation/http/teams#team-members-remove
            endpoint: `/2/team/members/remove`,
            data: {
                user: {
                    '.tag': 'team_member_id',
                    team_member_id: input.id
                }
            },
            retries: 3
        };

        await nango.post(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
