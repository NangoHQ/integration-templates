import { NangoAction, ProxyConfiguration, ArchiveOpportunity } from '../../models';

export default async function runAction(nango: NangoAction, input: ArchiveOpportunity): Promise<any> {
    if (!input.opportunityId) {
        throw new nango.ActionError({
            message: 'opportunityId can not be null or undefined'
        });
    }

    let putData: ArchiveOpportunity = {
        ...input
    };

    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#update-opportunity-archived-state
        endpoint: `/v1/opportunities/${input.opportunityId}/archived`,
        data: putData,
        retries: 10
    };

    await nango.put(config);
    return {
        success: true,
        opportunity: input.opportunityId
    };
}
