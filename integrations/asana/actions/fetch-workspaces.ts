import { createAction } from 'nango';
import { Anonymous_asana_action_fetchworkspaces_output, Limit } from '../models.js';

const action = createAction({
    description: 'Fetch the workspaces with a limit (default 10) of a user to allow them to selection of projects to sync',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/workspaces/limit'
    },

    input: Limit,
    output: Anonymous_asana_action_fetchworkspaces_output,

    exec: async (nango, input): Promise<Anonymous_asana_action_fetchworkspaces_output> => {
        const limit = input?.limit || 10;

        const response = await nango.get({
            endpoint: '/api/1.0/workspaces',
            params: {
                opt_fields: 'is_organization',
                limit
            },
            retries: 3
        });

        return response.data.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
