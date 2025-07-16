import { createAction } from "nango";
import { getCompany } from '../utils/get-company.js';
import { toQuickBooksCustomer, toCustomer } from '../mappers/to-customer.js';

import type { ProxyConfiguration } from "nango";
import { Customer, UpdateCustomer } from "../models.js";

/**
 * This function handles the partial update of a customer in QuickBooks via the Nango action.
 * It validates the input customer data, maps it to the appropriate QuickBooks customer structure,
 * and sends a request to sparse update the customer in the QuickBooks API.
 * For detailed endpoint documentation, refer to:
 * https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer#sparse-update-a-customer
 *
 * @param {NangoAction} nango - The Nango action instance to handle API requests.
 * @param {UpdateCustomer} input - The customer data input that will be sent to QuickBooks.
 * @throws {nango.ActionError} - Throws an error if the input is missing or lacks required fields.
 * @returns {Promise<Customer>} - Returns the created customer object from QuickBooks.
 */
const action = createAction({
    description: "Update a single customer in QuickBooks.",
    version: "0.0.1",

    endpoint: {
        method: "PUT",
        path: "/customers",
        group: "Customers"
    },

    input: UpdateCustomer,
    output: Customer,
    scopes: ["com.intuit.quickbooks.accounting"],

    exec: async (nango, input): Promise<Customer> => {
        // Validate if input is present
        if (!input) {
            throw new nango.ActionError({
                message: `Input customer object is required. Received: ${JSON.stringify(input)}`
            });
        }

        // Ensure that required fields are present for QuickBooks
        if (!input.id || !input.sync_token || (!input.title && !input.given_name && !input.display_name && !input.suffix)) {
            throw new nango.ActionError({
                message: `Both 'id' and 'sync_token' must be provided, and at least one of 'title', 'given_name', 'display_name', or 'suffix' must be non-empty. Received: ${JSON.stringify(input)}`
            });
        }

        const companyId = await getCompany(nango);
        // Map the customer input to the QuickBooks customer structure
        const quickBooksCustomer = toQuickBooksCustomer(input);

        const config: ProxyConfiguration = {
            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer#sparse-update-a-customer
            endpoint: `/v3/company/${companyId}/customer`,
            data: quickBooksCustomer,
            retries: 3
        };

        const response = await nango.post(config);

        return toCustomer(response.data['Customer']);
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
