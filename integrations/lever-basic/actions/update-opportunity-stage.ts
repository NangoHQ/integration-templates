import { NangoAction, ProxyConfiguration, UpdateOpportunityStage } from '../../models';

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

    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#update-opportunity-stage
        endpoint: `/v1/opportunities/${input.opportunityId}/stage`,
        data: putData,
        retries: 10
    };

    await nango.put(config);
    return {
        success: true,
        opportunity: input.opportunityId
    };
}
