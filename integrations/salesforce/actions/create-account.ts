import type { NangoAction, ProxyConfiguration, ActionResponse, CreateAccountInput } from '../../models';
import { createAccountInputSchema } from '../schema.zod.js';
import { toSalesForceAccount } from '../mappers/toAccount.js';

export default async function runAction(nango: NangoAction, input: CreateAccountInput): Promise<ActionResponse> {
    const parsedInput = createAccountInputSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a account: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create a account'
        });
    }

    const salesforceAccount = toSalesForceAccount(parsedInput.data);
    const config: ProxyConfiguration = {
        // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_account.htm
        endpoint: '/services/data/v60.0/sobjects/Account',
        data: salesforceAccount,
        retries: 10
    };
    const response = await nango.post(config);

    return response.data;
}