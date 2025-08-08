import { createAction } from 'nango';
import type { UnanetStage } from '../types.js';
import { toStage } from '../mappers/to-stage.js';

import { StageResponse } from '../models.js';
import { z } from 'zod';

const action = createAction({
    description: 'List all the stages that exist in the system. Use this action to find\nthe correct stage to be able to create an opportunity.',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/stages'
    },

    input: z.void(),
    output: StageResponse,

    exec: async (nango, _input): Promise<StageResponse> => {
        const response = await nango.get<UnanetStage[]>({
            endpoint: '/api/opportunities/stage',
            retries: 3
        });

        const { data } = response;

        return { stages: data.map(toStage) };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
