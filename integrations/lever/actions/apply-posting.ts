import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { ApplyToPosting, SuccessResponse } from '../models.js';

const action = createAction({
    description: 'Submit an application on behalf of a candidate. This endpoint can only be used to submit applications to published or unlisted postings.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/posts/apply',
        group: 'Posts'
    },

    input: ApplyToPosting,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        if (!input.postId) {
            throw new nango.ActionError({
                message: 'opportunityId can not be null or undefined'
            });
        }

        const putData: ApplyToPosting = {
            ...input
        };

        const path = `/v1/postings/${input.postId}/apply`;

        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#apply-to-a-posting
            endpoint: path,
            data: putData,
            retries: 3
        };

        if (input.send_confirmation_email !== undefined) {
            config.params = { send_confirmation_email: input.send_confirmation_email ? 'true' : 'false' };
        }

        const resp = await nango.post(config);
        return {
            success: true,
            response: resp.data.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
