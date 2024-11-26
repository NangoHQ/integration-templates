import type { NangoAction, ProxyConfiguration, SuccessResponse, UpdateTags } from '../../models.js';
import { buildUrlWithParams } from '../helpers/query.js';

export default async function runAction(nango: NangoAction, input: UpdateTags): Promise<SuccessResponse> {
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

    type postData = Pick<UpdateTags, 'tags'>;

    const putData: postData = {
        tags: input.tags
    };

    if (input?.delete) {
        endpoint = `/v1/opportunities/${input.opportunityId}/removeTags`;
    } else {
        endpoint = `/v1/opportunities/${input.opportunityId}/addTags`;
    }

    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#update-opportunity-tags
        endpoint,
        data: putData,
        retries: 10
    };

    if (input.perform_as) {
        config.params = { perform_as: input.perform_as };
    }

    const resp = await nango.post(config);
    return {
        success: true,
        opportunityId: input.opportunityId,
        response: resp.data.data
    };
}
