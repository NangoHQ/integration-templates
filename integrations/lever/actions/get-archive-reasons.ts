import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { SuccessResponse } from '../models.js';
import { z } from 'zod';

const action = createAction({
    description: 'Get all archived reasons',
    version: '1.0.1',

    input: z.void(),
    output: SuccessResponse,

    exec: async (nango): Promise<SuccessResponse> => {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-all-stages
            endpoint: `/v1/archive_reasons`,
            retries: 3
        };

        const resp = await nango.get(config);
        return {
            response: resp.data.data,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
