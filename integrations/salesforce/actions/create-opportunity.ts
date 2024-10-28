import type { NangoAction, ProxyConfiguration, ActionResponse, CreateOpportunityInput } from '../../models';
import { createOpportunityInputSchema } from '../schema.zod.js';
import { toSalesForceOpportunity } from '../mappers/toOpportunity.js';

export default async function runAction(nango: NangoAction, input: CreateOpportunityInput): Promise<ActionResponse> {
    const parsedInput = createOpportunityInputSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a opportunity: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create a opportunity'
        });
    }

    const salesforceOpportunity = toSalesForceOpportunity(parsedInput.data);
    const config: ProxyConfiguration = {
        // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_opportunity.htm
        endpoint: '/services/data/v60.0/sobjects/Opportunity',
        data: salesforceOpportunity,
        retries: 10
    };
    const response = await nango.post(config);

    return response.data;
}