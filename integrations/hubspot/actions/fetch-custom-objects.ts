import type { NangoAction, CustomObject, ProxyConfiguration } from '../../models';

export default async function runAction(nango: NangoAction): Promise<CustomObject> {
    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/crm-custom-objects
        endpoint: '/crm-object-schemas/v3/schemas',
        retries: 10
    };

    const response = await nango.get(config);

    return response.data;
}
