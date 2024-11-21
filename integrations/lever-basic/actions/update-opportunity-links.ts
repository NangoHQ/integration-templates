import { NangoAction, ProxyConfiguration, UpdateLinks } from '../../models';

export default async function runAction(nango: NangoAction, input: UpdateLinks): Promise<any> {
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

    let putData: UpdateLinks;
    putData = {
        ...input
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

    await nango.post(config);
    return {
        success: true,
        opportunity: input.opportunityId
    };
}
