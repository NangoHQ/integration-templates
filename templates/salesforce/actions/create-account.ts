import { createAction } from "nango";
import { createAccountInputSchema } from '../schema.zod.js';
import { toSalesForceAccount } from '../mappers/toAccount.js';

import type { ProxyConfiguration } from "nango";
import { ActionResponse, CreateAccountInput } from "../models.js";

const action = createAction({
    description: "Create a single account in salesforce",
    version: "1.0.1",

    endpoint: {
        method: "POST",
        path: "/accounts",
        group: "Accounts"
    },

    input: CreateAccountInput,
    output: ActionResponse,
    scopes: ["offline_access", "api"],

    exec: async (nango, input): Promise<ActionResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: createAccountInputSchema, input });

        const salesforceAccount = toSalesForceAccount(parsedInput.data);
        const config: ProxyConfiguration = {
            // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_account.htm
            endpoint: '/services/data/v60.0/sobjects/Account',
            data: salesforceAccount,
            retries: 3
        };
        const response = await nango.post(config);

        return response.data;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
