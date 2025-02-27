import type { NangoAction, ProxyConfiguration, SuccessResponse, CreateOpportunityInput } from '../../models';
import { updateOpportunityInputSchema } from '../schema.zod.js';
import { toSalesForceOpportunity } from '../mappers/toOpportunity.js';

export default async function runAction(nango: NangoAction, input: CreateOpportunityInput): Promise<SuccessResponse> {
    nango.zodValidate({ zodSchema: updateOpportunityInputSchema, input });

    await nango.patch(config);

    return {
        success: true
    };
}
