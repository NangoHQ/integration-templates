import type { NangoAction, ProxyConfiguration, Id, SuccessResponse } from '../../models';

export default async function runAction(nango: NangoAction, input: Id): Promise<SuccessResponse> {
    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/contacts#delete-contacts
        endpoint: `/crm/v3/objects/contacts/${input.id}`,
        retries: 3
    };
    await nango.delete(config);

    return {
        success: true
    };
}
