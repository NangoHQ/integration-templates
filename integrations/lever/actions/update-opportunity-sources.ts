import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { UpdateSources, SuccessResponse } from '../models.js';

const action = createAction({
    description: 'Update the sources in an opportunity',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/opportunities/sources',
        group: 'Opportunities'
    },

    input: UpdateSources,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        if (!input.opportunityId) {
            throw new nango.ActionError({
                message: 'opportunityId can not be null or undefined'
            });
        }

        let endpoint: string;
        type postData = Pick<UpdateSources, 'sources'>;

        const putData: postData = {
            sources: input.sources
        };

        if (input?.delete) {
            endpoint = `/v1/opportunities/${input.opportunityId}/removeSources`;
        } else {
            endpoint = `/v1/opportunities/${input.opportunityId}/addSources`;
        }

        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#update-opportunity-sources
            endpoint,
            data: putData,
            retries: 3
        };

        if (input.perform_as) {
            config.params = { perform_as: input.perform_as };
        }

        const resp = await nango.post(config);
        return {
            success: true,
            opportunityId: input.opportunityId,
            response: resp.data.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
