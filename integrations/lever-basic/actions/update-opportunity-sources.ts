import type { NangoAction, ProxyConfiguration, SuccessResponse, UpdateSources } from '../../models.js';
import { buildUrlWithParams } from '../helpers/query.js';

export default async function runAction(nango: NangoAction, input: UpdateSources): Promise<SuccessResponse> {
    if (!input.opportunityId) {
        throw new nango.ActionError({
            message: 'opportunityId can not be null or undefined'
        });
    }

    let endpoint: string;
    type postData = Pick<UpdateSources, 'sources'>;
    let putData: postData;

    putData = {
        sources: input.sources
    };

    if (input?.delete) {
        endpoint = `/v1/opportunities/${input.opportunityId}/removeSources`;
    } else {
        endpoint = `/v1/opportunities/${input.opportunityId}/addSources`;
    }

    if (input.perform_as) {
        endpoint = buildUrlWithParams(endpoint, { perform_as: input.perform_as });
    }

    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#update-opportunity-sources
        endpoint,
        data: putData,
        retries: 10
    };

    const resp = await nango.post(config);
    return {
        success: true,
        opportunityId: input.opportunityId,
        response: resp.data.data
    };
}
