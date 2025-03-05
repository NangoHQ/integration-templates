import type { CreateUpdateDealOutput, NangoAction, ProxyConfiguration, UpdateDealInput } from '../../models';
import { UpdateDealInputSchema } from '../schema.js';
import { createUpdateDeal, toHubspotDeal } from '../mappers/toDeal.js';

export default async function runAction(nango: NangoAction, input: UpdateDealInput): Promise<CreateUpdateDealOutput> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: UpdateDealInputSchema, input });

    const hubSpotDeal = toHubspotDeal(parsedInput.data);
    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/deals#update-deals
        endpoint: `crm/v3/objects/deals/${parsedInput.data.id}`,
        data: hubSpotDeal,
        retries: 10
    };

    const response = await nango.patch(config);

    return createUpdateDeal(response.data);
}
