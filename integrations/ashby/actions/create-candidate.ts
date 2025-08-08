import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { AshbyResponse, CreateCandidate } from '../models.js';

const action = createAction({
    description: 'Action to create a candidate.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/candidates',
        group: 'Candidates'
    },

    input: CreateCandidate,
    output: AshbyResponse,
    scopes: ['candidatesWrite'],

    exec: async (nango, input): Promise<AshbyResponse> => {
        if (!input.name) {
            throw new nango.ActionError({
                message: 'name is a required field'
            });
        }

        const config: ProxyConfiguration = {
            // https://developers.ashbyhq.com/reference/candidatecreate
            endpoint: '/candidate.create',
            data: input,
            retries: 3
        };

        const response = await nango.post(config);
        return {
            success: response.data.success,
            errors: response.data?.errors,
            results: response.data?.results
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
