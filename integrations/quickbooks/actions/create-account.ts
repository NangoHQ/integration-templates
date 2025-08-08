import { createAction } from "nango";
import { getCompany } from '../utils/get-company.js';
import { toQuickBooksAccount, toAccount } from '../mappers/to-account.js';

import type { ProxyConfiguration } from "nango";
import { Account, CreateAccount } from "../models.js";

/**
 * This function handles the creation of a account in QuickBooks via the Nango action.
 * It validates the input account data, maps it to the appropriate QuickBooks account structure,
 * and sends a request to create the account in the QuickBooks API.
 * For detailed endpoint documentation, refer to:
 * https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account#create-an-account
 *
 * @param {NangoAction} nango - The Nango action instance to handle API requests.
 * @param {CreateAccount} input - The account data input that will be sent to QuickBooks.
 * @throws {nango.ActionError} - Throws an error if the input is missing or lacks required fields.
 * @returns {Promise<Account>} - Returns the created account object from QuickBooks.
 */
const action = createAction({
    description: "Creates a single account in QuickBooks.",
    version: "1.0.0",

    endpoint: {
        method: "POST",
        path: "/accounts",
        group: "Accounts"
    },

    input: CreateAccount,
    output: Account,
    scopes: ["com.intuit.quickbooks.accounting"],

    exec: async (nango, input): Promise<Account> => {
        // Validate if input is present
        if (!input) {
            throw new nango.ActionError({
                message: `Input account object is required. Received: ${JSON.stringify(input)}`
            });
        }

        // Ensure that required fields are present for QuickBooks
        if (!input.name || (!input.account_type && !input.account_sub_type)) {
            throw new nango.ActionError({
                message: `Please provide a 'name' and at least one of the following: account_type or account_sub_type. Received: ${JSON.stringify(input)}`
            });
        }

        const companyId = await getCompany(nango);
        // Map the account input to the QuickBooks account structure
        const quickBooksAccount = toQuickBooksAccount(input);

        const config: ProxyConfiguration = {
            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account#create-an-account
            endpoint: `/v3/company/${companyId}/account`,
            data: quickBooksAccount,
            retries: 3
        };

        const response = await nango.post(config);

        return toAccount(response.data['Account']);
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
