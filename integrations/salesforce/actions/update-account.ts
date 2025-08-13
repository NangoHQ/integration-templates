import { createAction } from 'nango';
import { updateAccountInputSchema } from '../schema.zod.js';
import { toSalesForceAccount } from '../mappers/toAccount.js';

import type { ProxyConfiguration } from 'nango';
import { SuccessResponse, UpdateAccountInput } from '../models.js';

const action = createAction({
    description: 'Update a single account in salesforce',
    version: '2.0.0',

    endpoint: {
        method: 'PATCH',
        path: '/accounts',
        group: 'Accounts'
    },

    input: UpdateAccountInput,
    output: SuccessResponse,
    scopes: ['offline_access', 'api'],

    exec: async (nango, input): Promise<SuccessResponse> => {
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
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
