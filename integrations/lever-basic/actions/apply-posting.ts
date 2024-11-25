import type { ApplyToPosting, NangoAction, ProxyConfiguration, SuccessResponse } from '../../models.js';
import { buildUrlWithParams } from '../helpers/query.js';

export default async function runAction(nango: NangoAction, input: ApplyToPosting): Promise<SuccessResponse> {
    if (!input.postId) {
        throw new nango.ActionError({
            message: 'opportunityId can not be null or undefined'
        });
    }

    const putData: ApplyToPosting = {
        ...input
    };

    let path = `/v1/postings/${input.postId}/apply`;
    if (input.send_confirmation_email) {
        path = buildUrlWithParams(path, { send_confirmation_email: input.send_confirmation_email });
    }

    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#apply-to-a-posting
        endpoint: path,
        data: putData,
        retries: 10
    };

    const resp = await nango.post(config);
    return {
        success: true,
        response: resp.data.data
    };
}
