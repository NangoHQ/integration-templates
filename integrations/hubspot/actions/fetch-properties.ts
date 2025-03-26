import type { NangoAction, ProxyConfiguration, PropertyResponse, InputProperty } from '../../models';

export default async function runAction(nango: NangoAction, input: InputProperty): Promise<PropertyResponse> {
    if (!input.name) {
        throw new nango.ActionError({
            message: 'An object name must be passed in to look up the properties'
        });
    }

    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/properties
        endpoint: `crm/v3/properties/${input.name}`,
        retries: 3
    };
    const response = await nango.get(config);

    return response.data;
}
