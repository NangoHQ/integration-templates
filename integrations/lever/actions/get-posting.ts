import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { SuccessResponse, SinglePost } from '../models.js';

const action = createAction({
    description: 'Get single post for your account in Lever',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/posts/single',
        group: 'Posts'
    },

    input: SinglePost,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-all-stages
            endpoint: `/v1/postings/${input.id}`,
            retries: 3
        };

        const resp = await nango.get(config);
        return {
            success: true,
            response: resp.data.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
