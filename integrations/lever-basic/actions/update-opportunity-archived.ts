import { NangoAction, ProxyConfiguration, ArchiveOpportunity } from '../../models';
import { buildUrlWithParams } from '../helpers/query.js';

export default async function runAction(nango: NangoAction, input: ArchiveOpportunity): Promise<any> {
    if (!input.opportunityId) {
        throw new nango.ActionError({
            message: 'opportunityId can not be null or undefined'
        });
    }

    let putData: ArchiveOpportunity = {
        ...input
    };

    let path = `/v1/opportunities/${input.opportunityId}/archived`;
    if (input.perform_as) {
        path = buildUrlWithParams(path, { perform_as: input.perform_as });
        delete putData.perform_as;
    }

    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#update-opportunity-archived-state
        endpoint: path,
        data: putData,
        retries: 10
    };

    await nango.put(config);
    return {
        success: true,
        opportunity: input.opportunityId
    };
}
