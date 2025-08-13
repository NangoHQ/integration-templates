import { createAction } from 'nango';
import { getCompany } from '../utils/get-company.js';
import { toBill, toCreateQuickBooksBill } from '../mappers/to-bill.js';

import type { ProxyConfiguration } from 'nango';
import { Bill, CreateBill } from '../models.js';

/**
 * This function handles the creation of a bill in QuickBooks via the Nango action.
 * It validates the input bill data, maps it to the appropriate QuickBooks bill structure,
 * and sends a request to create the bill in the QuickBooks API.
 * For detailed endpoint documentation, refer to:
 * https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/bill#create-a-bill
 *
 * @param {NangoAction} nango - The Nango action instance to handle API requests.
 * @param {CreateBill} input - The input data that will be sent to QuickBooks.
 * @throws {nango.ActionError} - Throws an error if the input is missing or lacks required fields.
 * @returns {Promise<Bill>} - Returns the created bill object from QuickBooks.
 */
const action = createAction({
    description: 'Creates a single bill in QuickBooks.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/bills',
        group: 'Bills'
    },

    input: CreateBill,
    output: Bill,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<Bill> => {
        // Validate if input is present
        if (!input) {
            throw new nango.ActionError({
                message: `Input bill object is required. Received: ${JSON.stringify(input)}`
            });
        }

        // Validate required fields
        if (!input.vendor_id) {
            throw new nango.ActionError({
                message: `vendor_id is required and must include a value. Received: ${JSON.stringify(input.vendor_id)}`
            });
        }

        if (!input.line || input.line.length === 0) {
            throw new nango.ActionError({
                message: `At least one line item is required. Received: ${JSON.stringify(input.line)}`
            });
        }

        // Validate each line item
        for (const line of input.line) {
            if (!line.detail_type) {
                throw new nango.ActionError({
                    message: `detail_type is required for each line item. Received: ${JSON.stringify(line)}`
                });
            }

            if (line.amount === undefined) {
                throw new nango.ActionError({
                    message: `amount_cents is required for each line item. Received: ${JSON.stringify(line)}`
                });
            }

            if (!line.account_id) {
                throw new nango.ActionError({
                    message: `account_id  is required for each line item. Received: ${JSON.stringify(line.account_id)}`
                });
            }
        }

        const companyId = await getCompany(nango);

        const quickBooksBill = toCreateQuickBooksBill(input);

        const config: ProxyConfiguration = {
            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/bill#create-a-bill
            endpoint: `/v3/company/${companyId}/bill`,
            data: quickBooksBill,
            retries: 3
        };

        const response = await nango.post(config);

        return toBill(response.data['Bill']);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
