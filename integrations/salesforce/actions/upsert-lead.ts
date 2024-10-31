import type { NangoAction, ProxyConfiguration, SuccessResponse, UpsertLeadInput } from '../../models';
import { toSalesForceLead } from '../mappers/toLead.js';
import { upsertLeadInputSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: UpsertLeadInput): Promise<SuccessResponse> {
   
    const parsedInput = upsertLeadInputSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to upsert a lead: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to upsert a lead'
        });
    }
    console.log(parsedInput.data);

    const salesforceLead = toSalesForceLead(parsedInput.data);

    const config: ProxyConfiguration = {
        // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_account.htm
        endpoint: `/services/data/v60.0/sobjects/Lead/${parsedInput.data.field_name}/${parsedInput.data.field_value}`,
        data: salesforceLead,
        retries: 10
    };

    await nango.patch(config);

    return {
        success: true
    };
}
