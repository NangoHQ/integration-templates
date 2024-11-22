import { NangoAction, ProxyConfiguration, UpdateOpportunityStage } from '../../models';
import { buildUrlWithParams } from '../helpers/query.js';

export default async function runAction(nango: NangoAction, input: UpdateOpportunityStage): Promise<any> {
    if (!input.opportunityId) {
        throw new nango.ActionError({
            message: 'opportunityId can not be null or undefined'
        });
    }

    let putData: UpdateOpportunityStage;
    putData = {
        ...input
    };

    let endpoint = `/v1/opportunities/${input.opportunityId}/stage`;
    if (input.perform_as) {
        endpoint = buildUrlWithParams(endpoint, { perform_as: input.perform_as });
        delete putData.perform_as;
    }

    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#update-opportunity-stage
        endpoint,
        data: putData,
        retries: 10
    };

    await nango.put(config);
    return {
        success: true,
        opportunity: input.opportunityId
    };
}
