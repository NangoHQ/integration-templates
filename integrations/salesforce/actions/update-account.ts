import type { NangoAction, ProxyConfiguration, SuccessResponse, CreateAccountInput } from '../../models.js';
import { updateAccountInputSchema } from '../schema.zod.js';
import { toSalesForceAccount } from '../mappers/toAccount.js';

export default async function runAction(nango: NangoAction, input: CreateAccountInput): Promise<SuccessResponse> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: updateAccountInputSchema, input });

    const salesforceAccount = toSalesForceAccount(parsedInput.data);
    const config: ProxyConfiguration = {
        // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_account.htm
        endpoint: `/services/data/v60.0/sobjects/Account/${parsedInput.data.id}`,
        data: salesforceAccount,
        retries: 3
    };

    await nango.patch(config);

    return {
        success: true
    };
}
