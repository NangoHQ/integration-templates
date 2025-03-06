import type { NangoAction, ProxyConfiguration, SuccessResponse, CreateOpportunityInput } from '../../models';
import { updateOpportunityInputSchema } from '../schema.zod.js';
import { toSalesForceOpportunity } from '../mappers/toOpportunity.js';

export default async function runAction(nango: NangoAction, input: CreateOpportunityInput): Promise<SuccessResponse> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: updateOpportunityInputSchema, input });

    const salesforceOpportunity = toSalesForceOpportunity(parsedInput.data);
    const config: ProxyConfiguration = {
        // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_opportunity.htm
        endpoint: `/services/data/v60.0/sobjects/Opportunity/${parsedInput.data.id}`,
        data: salesforceOpportunity,
        retries: 10
    };

    await nango.patch(config);

    return {
        success: true
    };
}
