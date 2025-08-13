import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { GetStages } from '../models.js';
import { z } from 'zod';

const action = createAction({
    description:
        'Action to get lists all pipeline stages. Note that this does \nnot paginate the response so it is possible that not all stages \nare returned.',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/stages/limited',
        group: 'Stages'
    },

    input: z.void(),
    output: GetStages,

    exec: async (nango): Promise<GetStages> => {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-all-stages
            endpoint: `/v1/stages`,
            retries: 3
        };

        const resp = await nango.get(config);
        return {
            stages: resp.data.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
