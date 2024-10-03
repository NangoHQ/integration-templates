import type { NangoAction, ProxyConfiguration, CreateDeal, CreatedDeal } from '../../models';

export default async function runAction(nango: NangoAction, input: CreateDeal): Promise<CreatedDeal> {
    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/deals
        endpoint: 'crm/v3/objects/deals',
        data: input,
        retries: 10
    };
    const response = await nango.post(config);

    return response.data;
}
