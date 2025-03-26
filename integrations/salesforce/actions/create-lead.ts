import type { NangoAction, ProxyConfiguration, ActionResponse, CreateLeadInput } from '../../models';
import { createLeadInputSchema } from '../schema.zod.js';
import { toSalesForceLead } from '../mappers/toLead.js';

export default async function runAction(nango: NangoAction, input: CreateLeadInput): Promise<ActionResponse> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: createLeadInputSchema, input });

    const salesforceLead = toSalesForceLead(parsedInput.data);
    const config: ProxyConfiguration = {
        // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_lead.htm
        endpoint: '/services/data/v60.0/sobjects/Lead',
        data: salesforceLead,
        retries: 3
    };
    const response = await nango.post(config);

    return response.data;
}
