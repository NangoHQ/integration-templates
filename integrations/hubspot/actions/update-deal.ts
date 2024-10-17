import type { CreateUpdateDealOutput, NangoAction, ProxyConfiguration, UpdateDealInput } from '../../models';
import { UpdateDealInputSchema } from '../schema.js';
import { createUpdateDeal, toHubspotDeal } from '../mappers/toDeal.js';

export default async function runAction(nango: NangoAction, input: UpdateDealInput): Promise<CreateUpdateDealOutput> {
    const parsedInput = UpdateDealInputSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to update a deal: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to update a deal'
        });
    }

    const hubSpotDeal = toHubspotDeal(parsedInput.data);
    const config: ProxyConfiguration = {
        endpoint: `crm/v3/objects/deals/${parsedInput.data.id}`,
        data: hubSpotDeal,
        retries: 10
    };
    // https://developers.hubspot.com/docs/api/crm/deals#update-deals
    const response = await nango.patch(config);

    return createUpdateDeal(response.data);
}
