import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const LineItemSchema = z.object({
    line_item_id: z.string().describe('Unique identifier of the bill line item.'),
    item_id: z.string().optional().describe('ID of the catalog item, or an empty string for a non-catalog line item.'),
    name: z.string().describe('Name of the item or expense on the line.'),
    description: z.string().optional().describe('Free-text description of the line item.'),
    quantity: z.number().optional().describe('Quantity billed on this line.'),
    rate: z.number().optional().describe('Unit rate applied to the line item.'),
    item_total: z.number().optional().describe('Line total (quantity multiplied by rate, less line-level discounts).'),
    unit: z.string().optional().describe('Unit of measure for the line item, if any.'),
    account_id: z.string().optional().describe('ID of the expense account attributed to this line.'),
    account_name: z.string().optional().describe('Name of the expense account attributed to this line.'),
    tax_id: z.string().optional().describe('ID of the tax applied to this line, if any.'),
    tax_name: z.string().optional().describe('Name of the tax applied to this line, if any.'),
    tax_percentage: z.number().optional().describe('Tax percentage applied to this line.'),
    item_order: z.number().optional().describe('Position of this line item within the bill.')
});

const PaymentSchema = z.object({
    payment_id: z.string().describe('Unique identifier of the payment recorded against the bill.'),
    payment_mode: z.string().optional().describe('Mode of payment, for example "Cash", "Bank Transfer" or "Check".'),
    payment_number: z.string().optional().describe('Payment number assigned by Zoho.'),
    description: z.string().optional().describe('Memo or description recorded with the payment.'),
    date: z.string().optional().describe('Date the payment was recorded (yyyy-MM-dd).'),
    reference_number: z.string().optional().describe('Reference number recorded with the payment.'),
    amount: z.number().optional().describe('Amount of the payment applied to the bill.'),
    apply_date: z.string().optional().describe('Date the payment was applied to the bill (yyyy-MM-dd).'),
    paid_through_account_id: z.string().optional().describe('ID of the account the payment was made from.'),
    paid_through_account_name: z.string().optional().describe('Name of the account the payment was made from.'),
    status: z.string().optional().describe('Status of the payment.')
});

const AddressSchema = z.object({
    address: z.string().optional().describe('Street address.'),
    street2: z.string().optional().describe('Second line of the street address.'),
    city: z.string().optional().describe('City.'),
    state: z.string().optional().describe('State or province.'),
    zip: z.string().optional().describe('ZIP or postal code.'),
    country: z.string().optional().describe('Country.'),
    phone: z.string().optional().describe('Phone number.'),
    attention: z.string().optional().describe('Attention-to contact for the address.')
});

const InputSchema = z
    .object({
        bill_id: z.string().describe('Unique identifier of the vendor bill to retrieve. Example: "260815000000117048"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Input for retrieving one vendor bill by ID.');

const OutputSchema = z
    .object({
        bill_id: z.string().describe('Unique identifier of the vendor bill.'),
        bill_number: z.string().optional().describe('Bill number assigned by Zoho.'),
        reference_number: z.string().optional().describe('Vendor reference number for the bill.'),
        vendor_id: z.string().optional().describe('ID of the vendor associated with the bill.'),
        vendor_name: z.string().optional().describe('Name of the vendor associated with the bill.'),
        status: z.string().optional().describe('Current status of the bill, for example "open", "overdue", "paid", "partially_paid" or "void".'),
        current_sub_status: z.string().optional().describe('Sub-status of the bill workflow, if any.'),
        date: z.string().optional().describe('Bill date (yyyy-MM-dd).'),
        due_date: z.string().optional().describe('Date the bill payment is due (yyyy-MM-dd).'),
        currency_id: z.string().optional().describe('ID of the currency used on the bill.'),
        currency_code: z.string().optional().describe('ISO currency code, for example "USD".'),
        exchange_rate: z.number().optional().describe('Exchange rate of the bill currency against the base currency.'),
        sub_total: z.number().optional().describe('Sum of line item totals before taxes, discounts and adjustments.'),
        tax_total: z.number().optional().describe('Total tax amount on the bill.'),
        discount_total: z.number().optional().describe('Total discount applied to the bill.'),
        adjustment: z.number().optional().describe('Adjustment amount applied to the bill total.'),
        total: z.number().optional().describe('Final total amount of the bill.'),
        payment_made: z.number().optional().describe('Amount already paid against the bill.'),
        vendor_credits_applied: z.number().optional().describe('Total vendor credits applied to the bill.'),
        balance: z.number().optional().describe('Outstanding balance still due on the bill.'),
        notes: z.string().optional().describe('Notes recorded on the bill.'),
        terms: z.string().optional().describe('Terms and conditions recorded on the bill.'),
        created_time: z.string().optional().describe('Timestamp when the bill was created, including the timezone offset.'),
        last_modified_time: z.string().optional().describe('Timestamp when the bill was last modified, including the timezone offset.'),
        created_by_id: z.string().optional().describe('ID of the user who created the bill.'),
        purchaseorder_ids: z.array(z.string()).optional().describe('IDs of purchase orders associated with this bill.'),
        line_items: z.array(LineItemSchema).optional().describe('Line items on the bill.'),
        payments: z.array(PaymentSchema).optional().describe('Payments recorded against the bill.'),
        billing_address: AddressSchema.optional().describe('Billing address of the vendor.')
    })
    .describe('Full detail of a single vendor bill.');

const ProviderEnvelopeSchema = z.object({
    code: z.number(),
    message: z.string()
});

const BillResponseSchema = z.object({
    bill: OutputSchema
});

/**
 * @tags: [read]
 * @tagReason: Fetches a single vendor bill from Zoho Inventory without modifying any provider data.
 * @pitfalls: Bills are created directly in "open" or "overdue" status with no reachable "draft" state, and an unknown or deleted bill ID throws a "Bill does not exist" error instead of returning an empty result.
 */
const action = createAction({
    description: 'Get full details for one vendor bill by ID.',
    version: '1.0.0',
    scopes: ['ZohoInventory.bills.READ', 'ZohoInventory.settings.READ'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const response = await nango.get({
            // https://www.zoho.com/inventory/api/v1/bills/#retrieve-a-bill
            endpoint: `/inventory/v1/bills/${encodeURIComponent(input.bill_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const envelope = ProviderEnvelopeSchema.safeParse(response.data);
        if (!envelope.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Zoho Inventory returned an unexpected response for the bill.',
                bill_id: input.bill_id
            });
        }

        if (envelope.data.code !== 0) {
            throw new nango.ActionError({ type: 'provider_error', message: envelope.data.message, code: envelope.data.code });
        }

        const parsed = BillResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Zoho Inventory returned an unexpected response for the bill.',
                bill_id: input.bill_id
            });
        }

        return parsed.data.bill;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
