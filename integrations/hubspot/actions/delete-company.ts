import type { NangoAction, ProxyConfiguration, Id, SuccessResponse } from '../../models.js';

export default async function runAction(nango: NangoAction, input: Id): Promise<SuccessResponse> {
    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/companies#delete-companies
        endpoint: `/crm/v3/objects/companies/${input.id}`,
        retries: 3
    };

    await nango.delete(config);

    return {
        success: true
    };
}
