import type { UpsertAccountInput, ProxyConfiguration, SuccessResponse, NangoAction } from '../../models';
import { upsertAccountInputSchema } from '../schema.zod.js';
import { toSalesForceAccount } from '../mappers/toAccount.js';

export default async function runAction(nango: NangoAction, input: UpsertAccountInput): Promise<SuccessResponse> {
    const parsedInput = upsertAccountInputSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to upsert an account: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to upsert an account'
        });
    }

    await nango.log(parsedInput.data);
    const salesforceAccount = toSalesForceAccount(parsedInput.data);

    const config: ProxyConfiguration = {
        // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_account.htm
        endpoint: `/services/data/v60.0/sobjects/Account/${parsedInput.data.field_name}/${parsedInput.data.field_value}`,
        data: salesforceAccount,
        retries: 10
    };

    await nango.patch(config);

    return {
        success: true
    };
}
