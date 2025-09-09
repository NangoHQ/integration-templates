import { createAction } from 'nango';
import type { DatasetsResponse } from '../types.js';
import { Anonymous_bamboohrbasic_action_fetchdatasets_output } from '../models.js';
import { z } from 'zod';

const action = createAction({
    description: 'Fetch available datasets from BambooHR',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/datasets'
    },

    input: z.void(),
    output: Anonymous_bamboohrbasic_action_fetchdatasets_output,

    exec: async (nango): Promise<Anonymous_bamboohrbasic_action_fetchdatasets_output> => {
        const response = await nango.get<DatasetsResponse>({
            // https://documentation.bamboohr.com/reference/getdatasets-1
            endpoint: '/v1/datasets',
            headers: {
                Accept: 'application/json'
            },
            retries: 3
        });

        return response.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
