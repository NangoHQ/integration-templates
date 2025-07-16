import { createAction } from "nango";
import { getCompany } from '../utils/get-company.js';
import { toQuickBooksPayment, toPayment } from '../mappers/to-payment.js';

import type { ProxyConfiguration } from "nango";
import { Payment, CreatePayment } from "../models.js";

/**
 * This function handles the creation of an invoice in QuickBooks via the Nango action.
 * It validates the input invoice data, maps it to the appropriate QuickBooks invoice structure,
 * and sends a request to create the invoice in the QuickBooks API.
 * For detailed endpoint documentation, refer to:
 * https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/payment#create-a-payment
 *
 * @param {NangoAction} nango - The Nango action instance to handle API requests.
 * @param {CreatePayment} input - The invoice data input that will be sent to QuickBooks.
 * @throws {nango.ActionError} - Throws an error if the input is missing or lacks required fields.
 * @returns {Promise<Payment>} - Returns the created invoice object from QuickBooks.
 */
const action = createAction({
    description: "Creates a single payment in QuickBooks.",
    version: "0.0.1",

    endpoint: {
        method: "POST",
        path: "/payments",
        group: "Payments"
    },

    input: CreatePayment,
    output: Payment,
    scopes: ["com.intuit.quickbooks.accounting"],

    exec: async (nango, input): Promise<Payment> => {
        // Validate if input is present
        if (!input) {
            throw new nango.ActionError({
                message: `Input invoice object is required. Received: ${JSON.stringify(input)}`
            });
        }

        // Validate required fields
        if (!input.customer_ref || !input.customer_ref.value) {
            throw new nango.ActionError({
                message: `CustomerRef is required and must include a value. Received: ${JSON.stringify(input.customer_ref)}`
            });
        }

        if (!input.total_amount_cents) {
            throw new nango.ActionError({
                message: `Amount_cents is required for the payment is required. Received: ${JSON.stringify(input)}`
            });
        }

        const companyId = await getCompany(nango);
        // Map the invoice input to the QuickBooks invoice structure
        const quickBooksPayment = toQuickBooksPayment(input);

        const config: ProxyConfiguration = {
            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/payment#create-a-payment
            endpoint: `/v3/company/${companyId}/payment`,
            data: quickBooksPayment,
            retries: 3
        };

        const response = await nango.post(config);

        return toPayment(response.data['Payment']);
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
