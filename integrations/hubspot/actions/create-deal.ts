import type { NangoAction, ProxyConfiguration, CreateDealInput, CreateUpdateDealOutput } from '../../models';
import { createUpdateDeal, toHubspotDeal } from '../mappers/toDeal.js';

export default async function runAction(nango: NangoAction, input: CreateDealInput): Promise<CreateUpdateDealOutput> {
    const hubSpotDeal = toHubspotDeal(input);
    const config: ProxyConfiguration = {
        endpoint: 'crm/v3/objects/deals',
        data: hubSpotDeal,
        retries: 10
    };

    // https://developers.hubspot.com/docs/api/crm/deals#create-deals
    const response = await nango.post(config);

    return createUpdateDeal(response.data);
}
