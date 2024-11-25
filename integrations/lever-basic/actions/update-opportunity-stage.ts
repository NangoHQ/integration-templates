import type { NangoAction, ProxyConfiguration, SuccessResponse, UpdateOpportunityStage } from '../../models.js';
import { buildUrlWithParams } from '../helpers/query.js';

export default async function runAction(nango: NangoAction, input: UpdateOpportunityStage): Promise<SuccessResponse> {
    if (!input.opportunityId) {
        throw new nango.ActionError({
            message: 'opportunityId can not be null or undefined'
        });
    }

    type postData = Pick<UpdateOpportunityStage, 'stage'>;
    let putData: postData;

    putData = {
        stage: input.stage
    };

    let endpoint = `/v1/opportunities/${input.opportunityId}/stage`;
    if (input.perform_as) {
        endpoint = buildUrlWithParams(endpoint, { perform_as: input.perform_as });
    }

    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#update-opportunity-stage
        endpoint,
        data: putData,
        retries: 10
    };

    const resp = await nango.put(config);
    return {
        success: true,
        opportunityId: input.opportunityId,
        response: resp.data.data
    };
}
