import type { NangoAction, CreatePurchaseOrder, PurchaseOrder, ProxyConfiguration } from '../../models';
import { getCompany } from '../utils/get-company.js';
import { toQuickBooksPurchaseOrder, toPurchaseOrder } from '../mappers/to-purchase-order.js';

/**
 * This function handles the creation of a PurchaseOrder in QuickBooks via the Nango action.
 * It validates the input PurchaseOrder data, maps it to the appropriate QuickBooks PurchaseOrder structure,
 * and sends a request to create the PurchaseOrder in the QuickBooks API.
 * For detailed endpoint documentation, refer to:
 * https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/purchaseorder#create-a-purchase-order
 *
 * @param {NangoAction} nango - The Nango action instance to handle API requests.
 * @param {CreatePurchaseOrder} input - The Purchase Order data input that will be sent to QuickBooks.
 * @throws {nango.ActionError} - Throws an error if the input is missing or lacks required fields.
 * @returns {Promise<PurchaseOrder>} - Returns the created Purchase Order object from QuickBooks.
 */
export default async function runAction(nango: NangoAction, input: CreatePurchaseOrder): Promise<PurchaseOrder> {
    // Validate if input is present
    ///
    if (!input) {
        throw new nango.ActionError({
            message: `Input credit memo object is required. Received: ${JSON.stringify(input)}`
        });
    }

    // Validate required fields
    if (!input.ap_account_ref?.value) {
        throw new nango.ActionError({
            message: `ap_account_ref is required and must include a value. Received: ${JSON.stringify(input.ap_account_ref)}`
        });
    }

    if (!input.vendor_ref?.value) {
        throw new nango.ActionError({
            message: `vendor_ref is required and must include a value. Received: ${JSON.stringify(input.vendor_ref)}`
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

        if (line.amount_cents === undefined) {
            throw new nango.ActionError({
                message: `amount_cents is required for each line item. Received: ${JSON.stringify(line)}`
            });
        }

        if (!line.item_based_expense_line_detail) {
            throw new nango.ActionError({
                message: `item_based_expense_line_detail is required for each line item. Received: ${JSON.stringify(line.item_based_expense_line_detail)}`
            });
        }
    }

    ///

    const companyId = await getCompany(nango);
    // Map the PurchaseOrder input to the QuickBooks PurchaseOrder structure
    const quickBooksPurchaseOrder = toQuickBooksPurchaseOrder(input);

    const config: ProxyConfiguration = {
        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/purchaseorder#create-a-purchase-order
        endpoint: `/v3/company/${companyId}/purchaseorder`,
        data: quickBooksPurchaseOrder,
        retries: 3
    };

    const response = await nango.post(config);

    return toPurchaseOrder(response.data['PurchaseOrder']);
}
