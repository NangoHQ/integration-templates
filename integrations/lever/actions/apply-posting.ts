import type { ApplyToPosting, NangoAction, ProxyConfiguration, SuccessResponse } from '../../models.js';

export default async function runAction(nango: NangoAction, input: ApplyToPosting): Promise<SuccessResponse> {
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
