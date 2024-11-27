import type { NangoAction, ProxyConfiguration, SuccessResponse, UpdateLinks } from '../../models.js';

export default async function runAction(nango: NangoAction, input: UpdateLinks): Promise<SuccessResponse> {
    let endpoint: string;

    if (input.links.length <= 0) {
        throw new nango.ActionError({
            message: 'links can not be an empty array'
        });
    }

    if (!input.opportunityId) {
        throw new nango.ActionError({
            message: 'opportunityId can not be null or undefined'
        });
    }

    const putData = {
        links: input.links
    };

    if (input?.delete) {
        endpoint = `/v1/opportunities/${input.opportunityId}/removeLinks`;
    } else {
        endpoint = `/v1/opportunities/${input.opportunityId}/addLinks`;
    }

    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#update-contact-links-by-opportunity
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
