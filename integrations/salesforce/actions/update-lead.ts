import type { NangoAction, ProxyConfiguration, SuccessResponse, CreateLeadInput } from '../../models';
import { updateLeadInputSchema } from '../schema.zod.js';
import { toSalesForceLead } from '../mappers/toLead.js';

export default async function runAction(nango: NangoAction, input: CreateLeadInput): Promise<SuccessResponse> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: updateLeadInputSchema, input });

    const salesforceLead = toSalesForceLead(parsedInput.data);
    const config: ProxyConfiguration = {
        // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_lead.htm
        endpoint: `/services/data/v60.0/sobjects/Lead/${parsedInput.data.id}`,
        data: salesforceLead,
        retries: 10
    };

    await nango.patch(config);

    return {
        success: true
    };
}
