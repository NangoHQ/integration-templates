import { NangoAction, ProxyConfiguration, UpdateTags } from '../../models';
import { buildUrlWithParams } from '../helpers/query';

export default async function runAction(nango: NangoAction, input: UpdateTags): Promise<any> {
    let endpoint: string;

    if (!input.opportunityId) {
        throw new nango.ActionError({
            message: 'opportunityId can not be null or undefined'
        });
    }

    if (input.tags.length <= 0) {
        throw new nango.ActionError({
            message: 'tags can not be an empty array'
        });
    }

    let putData: UpdateTags;
    putData = {
        ...input
    };

    if (input?.delete) {
        endpoint = `/v1/opportunities/${input.opportunityId}/removeTags`;
    } else {
        endpoint = `/v1/opportunities/${input.opportunityId}/addTags`;
    }

    if (input.perform_as) {
        endpoint = buildUrlWithParams(endpoint, { perform_as: input.perform_as });
        delete putData.perform_as;
    }

    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#update-opportunity-tags
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
