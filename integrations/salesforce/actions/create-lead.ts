import type { NangoAction, ProxyConfiguration, ActionResponse, CreateLeadInput } from '../../models';
import { createLeadInputSchema } from '../schema.zod.js';
import { toSalesForceLead } from '../mappers/toLead.js';

export default async function runAction(nango: NangoAction, input: CreateLeadInput): Promise<ActionResponse> {
    const parsedInput = createLeadInputSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a lead: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create a lead'
        });
    }

    const salesforceLead = toSalesForceLead(parsedInput.data);
    const config: ProxyConfiguration = {
        // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_lead.htm
        endpoint: '/services/data/v60.0/sobjects/Lead',
        data: salesforceLead,
        retries: 10
    };
    const response = await nango.post(config);

    return response.data;
}