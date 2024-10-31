// import type { NangoAction, ProxyConfiguration, ActionResponse, CreateLeadInput } from '../../models';
import type { NangoAction, ProxyConfiguration, CreateLeadInput } from '../../models';
import { createLeadInputSchema } from '../schema.zod.js';
import { toSalesForceLead } from '../mappers/toLead.js';

export default async function runAction(nango: NangoAction, input: CreateLeadInput): Promise<any> {
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

    try {
        await nango.post(config);
        return {
            success: true
        };
    } catch (error: any) {
        // Check if error is due to duplicate
        if (error?.response?.data?.[0]?.duplicateResult?.matchResults?.[0]?.matchRecords?.[0]?.record?.Id) {
            const duplicateRecordId = error.response.data[0].duplicateResult.matchResults[0].matchRecords[0].record.Id;

            // Configure upsert request
            const upsertConfig: ProxyConfiguration = {
                endpoint: `/services/data/v60.0/sobjects/Lead/${duplicateRecordId}`,
                data: salesforceLead,
                retries: 10
            };

            await nango.patch(upsertConfig);
            return {
                success: true
            };
        }
        
        // If error is not due to duplicate, throw original error
        await nango.log(`Failed to create lead: ${error.message}`, { level: 'error' });
        throw new nango.ActionError({
            message: 'Failed to create lead'
        });
    }
}
