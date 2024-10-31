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
        endpoint: `/services/data/v60.0/sobjects/Lead/${parsedInput.data.external_id_field}/${parsedInput.data.external_id_value}`,
        data: salesforceLead,
        retries: 10
    };

    await nango.patch(config);

    return {
        success: true
    };
}
