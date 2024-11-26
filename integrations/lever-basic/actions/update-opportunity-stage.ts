import type { NangoAction, ProxyConfiguration, SuccessResponse, UpdateOpportunityStage } from '../../models.js';

export default async function runAction(nango: NangoAction, input: UpdateOpportunityStage): Promise<SuccessResponse> {
    if (!input.opportunityId) {
        throw new nango.ActionError({
            message: 'opportunityId can not be null or undefined'
        });
    }

    type postData = Pick<UpdateOpportunityStage, 'stage'>;

    const putData: postData = {
        stage: input.stage
    };

    const endpoint = `/v1/opportunities/${input.opportunityId}/stage`;
    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#update-opportunity-stage
        endpoint,
        data: putData,
        retries: 10
    };

    if (input.perform_as) {
        config.params = { perform_as: input.perform_as };
    }

    const resp = await nango.put(config);
    return {
        success: true,
        opportunityId: input.opportunityId,
        response: resp.data.data
    };
}
