import { createAction } from 'nango';
import type { DatasetField } from '../types.js';
import { Anonymous_bamboohrbasic_action_fetchfields_output } from '../models.js';
import { z } from 'zod';

const action = createAction({
    description: 'Fetch fields for a specific dataset',
    version: '3.0.0',

    endpoint: {
        method: 'GET',
        path: '/fields'
    },

    input: z.object({
        datasetName: z.string().optional()
    }),
    output: Anonymous_bamboohrbasic_action_fetchfields_output,

    exec: async (nango, input): Promise<Anonymous_bamboohrbasic_action_fetchfields_output> => {
        const datasetName = input?.datasetName || 'employee';

        const response = await nango.get<DatasetField[]>({
            // https://documentation.bamboohr.com/reference/get-fields-from-dataset
            endpoint: `/v1/datasets/${datasetName}/fields`,
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
