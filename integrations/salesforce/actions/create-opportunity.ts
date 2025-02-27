import type { NangoAction, ProxyConfiguration, ActionResponse, CreateOpportunityInput } from '../../models';
import { createOpportunityInputSchema } from '../schema.zod.js';
import { toSalesForceOpportunity } from '../mappers/toOpportunity.js';

export default async function runAction(nango: NangoAction, input: CreateOpportunityInput): Promise<ActionResponse> {
    nango.zodValidateInput({ zodSchema: createOpportunityInputSchema, input });
    const response = await nango.post(config);

    return response.data;
}
