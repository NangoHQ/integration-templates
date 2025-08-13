import { createAction } from 'nango';
import { getCompany } from '../utils/get-company.js';
import { toQuickBooksCreditMemo, toCreditMemo } from '../mappers/to-credit-memo.js';

import type { ProxyConfiguration } from 'nango';
import { CreditMemo, UpdateCreditMemo } from '../models.js';

/**
 * This function handles the partial update of a credit memo in QuickBooks via the Nango action.
 * It validates the input credit memo data, maps it to the appropriate QuickBooks credit memo structure,
 * and sends a request to sparse update the credit memo in the QuickBooks API.
 * For detailed endpoint documentation, refer to:
 * https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/creditmemo#full-update-a-credit-memo
 *
 * @param {NangoAction} nango - The Nango action instance to handle API requests.
 * @param {UpdateCreditMemo} input - The credit memo data input that will be sent to QuickBooks.
 * @throws {nango.ActionError} - Throws an error if the input is missing or lacks required fields.
 * @returns {Promise<CreditMemo>} - Returns the created credit memo object from QuickBooks.
 */
const action = createAction({
    description: 'Updates a single credit memo in QuickBooks.',
    version: '1.0.0',

    endpoint: {
        method: 'PUT',
        path: '/credit-memos',
        group: 'Credit Memos'
    },

    input: UpdateCreditMemo,
    output: CreditMemo,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<CreditMemo> => {
        // Validate if input is present
        if (!input) {
            throw new nango.ActionError({
                message: `Input credit memo object is required. Received: ${JSON.stringify(input)}`
            });
        }

        // Ensure that required fields are present for QuickBooks
        if (!input.id || !input.sync_token) {
            throw new nango.ActionError({
                message: `No id or sync_token is provided.`
            });
        }

        const companyId = await getCompany(nango);
        // Map the credit memo input to the QuickBooks credit memo structure
        const quickBooksInvoice = toQuickBooksCreditMemo(input);

        const config: ProxyConfiguration = {
            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/creditmemo#full-update-a-credit-memo
            endpoint: `/v3/company/${companyId}/creditmemo`,
            data: quickBooksInvoice,
            retries: 3
        };

        const response = await nango.post(config);

        return toCreditMemo(response.data['CreditMemo']);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
