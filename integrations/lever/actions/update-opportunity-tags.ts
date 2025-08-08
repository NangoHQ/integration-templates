import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { UpdateTags, SuccessResponse } from '../models.js';

const action = createAction({
    description: 'Update the tags in an opportunity',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/opportunities/tags',
        group: 'Opportunities'
    },

    input: UpdateTags,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        let endpoint: string;

        if (!input.opportunityId) {
            throw new nango.ActionError({
                message: 'opportunityId can not be null or undefined'
            });
        }

        if (input.tags.length <= 0) {
            throw new nango.ActionError({
                message: 'tags can not be an empty array'
            });
        }

        type postData = Pick<UpdateTags, 'tags'>;

        const putData: postData = {
            tags: input.tags
        };

        if (input?.delete) {
            endpoint = `/v1/opportunities/${input.opportunityId}/removeTags`;
        } else {
            endpoint = `/v1/opportunities/${input.opportunityId}/addTags`;
        }

        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#update-opportunity-tags
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
