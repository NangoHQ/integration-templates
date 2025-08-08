import { createAction } from 'nango';
import { Anonymous_unanet_action_getleads_output } from '../models.js';
import { z } from 'zod';

const action = createAction({
    description: 'Fetch all leads',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/leads',
        group: 'Leads'
    },

    input: z.void(),
    output: Anonymous_unanet_action_getleads_output,

    exec: async (nango, _input): Promise<Anonymous_unanet_action_getleads_output> => {
        const response = await nango.get({
            endpoint: '/api/leads',
            retries: 3
        });

        return response.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
