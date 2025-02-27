import type { CreateUpdateDealOutput, NangoAction, ProxyConfiguration, UpdateDealInput } from '../../models';
import { UpdateDealInputSchema } from '../schema.js';
import { createUpdateDeal, toHubspotDeal } from '../mappers/toDeal.js';

export default async function runAction(nango: NangoAction, input: UpdateDealInput): Promise<CreateUpdateDealOutput> {
    nango.zodValidateInput({ zodSchema: UpdateDealInputSchema, input });

    const response = await nango.patch(config);

    return createUpdateDeal(response.data);
}
