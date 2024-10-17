import type { NangoAction, ProxyConfiguration, Id, SuccessResponse } from '../../models';

export default async function runAction(nango: NangoAction, input: Id): Promise<SuccessResponse> {
    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/deals#delete-deals
        endpoint: `/crm/v3/objects/deals/${input.id}`,
        retries: 10
    };
    await nango.delete(config);

    return {
        success: true
    };
}
