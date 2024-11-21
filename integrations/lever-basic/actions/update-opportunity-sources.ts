import { NangoAction, ProxyConfiguration, UpdateSources } from '../../models';

export default async function runAction(nango: NangoAction, input: UpdateSources): Promise<any> {
    if (!input.opportunityId) {
        throw new nango.ActionError({
            message: 'opportunityId can not be null or undefined'
        });
    }

    let endpoint: string;
    let putData: UpdateSources;

    putData = {
        ...input
    };

    if (input?.delete) {
        endpoint = `/v1/opportunities/${input.opportunityId}/removeSources`;
    } else {
        endpoint = `/v1/opportunities/${input.opportunityId}/addSources`;
    }

    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#update-opportunity-sources
        endpoint,
        data: putData,
        retries: 10
    };

    await nango.post(config);
    return {
        success: true,
        opportunity: input.opportunityId
    };
}
