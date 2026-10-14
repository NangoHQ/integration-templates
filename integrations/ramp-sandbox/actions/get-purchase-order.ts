import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the smallest denomination of the currency (e.g. cents for USD). Example: 2050000'),
    currency_code: z.string().describe('ISO 4217 currency code. Example: "USD"'),
    minor_unit_conversion_rate: z.number().describe('Divisor used to convert the amount to the major currency unit. Example: 100')
});

const AddressSchema = z.object({
    address1: z.string().describe('Primary street address line.'),
    address2: z.string().nullable().describe('Secondary street address line.'),
    city: z.string().describe('City name.'),
    state: z.string().nullable().describe('State or region.'),
    postal_code: z.string().nullable().describe('Postal or ZIP code.'),
    country: z.string().describe('Country name or code.')
});

const AccountingFieldSchema = z.object({
    id: z.string().describe('Unique identifier of the accounting field.'),
    name: z.string().describe('Name of the accounting field.'),
    external_id: z.string().describe('External identifier of the accounting field in the accounting system.'),
    type: z.string().describe('Accounting field type. Example: "GL_ACCOUNT"')
});

const AccountingFieldSelectionSchema = z.object({
    id: z.string().describe('Unique identifier of the selected accounting field option.'),
    name: z.string().describe('Name of the accounting field option.'),
    display_name: z.string().describe('Customer-facing display name of the accounting field option.'),
    external_id: z.string().describe('External identifier of the accounting field option.'),
    external_code: z.string().nullable().describe('External code of the accounting field option.'),
    provider_name: z.string().nullable().describe('Name of the accounting provider.'),
    category_info: AccountingFieldSchema.describe('Accounting field this option belongs to.')
});

const ProviderLineItemSchema = z.object({
    id: z.string(),
    description: z.string().nullable(),
    quantity: z.number().nullable(),
    unit_price: CurrencyAmountSchema.nullable(),
    amount: CurrencyAmountSchema,
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    external_id: z.string().nullable(),
    remote_id: z.string().nullable(),
    withholding_rate: z.string().nullable(),
    accounting_field_selections: z.array(AccountingFieldSelectionSchema)
});

const ProviderPurchaseOrderSchema = z.object({
    id: z.string(),
    purchase_order_number: z.string().nullable(),
    name: z.string().nullable(),
    amount: CurrencyAmountSchema,
    spend_total_amount: CurrencyAmountSchema.nullable(),
    billing_status: z.string().nullable(),
    receipt_status: z.string(),
    creation_source: z.string(),
    three_way_match_enabled: z.boolean(),
    memo: z.string().nullable(),
    external_id: z.string().nullable(),
    remote_id: z.string().nullable(),
    vendor_id: z.string().nullable(),
    entity_id: z.string(),
    owner_id: z.string().nullable(),
    user_id: z.string().nullable(),
    spend_program_id: z.string().nullable(),
    spend_request_id: z.string().nullable(),
    spend_start_date: z.string().nullable(),
    spend_end_date: z.string().nullable(),
    promise_date: z.string().nullable(),
    archived_at: z.string().nullable(),
    net_payment_terms: z.number().nullable(),
    withholding_default_rate: z.string().nullable(),
    ramp_url: z.string(),
    ship_to_company_name: z.string().nullable(),
    ship_to_address: AddressSchema.nullable(),
    shipping_contact_first_name: z.string().nullable(),
    shipping_contact_last_name: z.string().nullable(),
    shipping_contact_email: z.string().nullable(),
    shipping_contact_phone_number: z.string().nullable(),
    bill_ids: z.array(z.string()),
    transaction_ids: z.array(z.string()),
    item_receipt_ids: z.array(z.string()),
    line_items: z.array(ProviderLineItemSchema),
    accounting_field_selections: z.array(AccountingFieldSelectionSchema)
});

const AddressOutputSchema = z.object({
    address1: z.string().describe('Primary street address line.'),
    address2: z.string().optional().describe('Secondary street address line.'),
    city: z.string().describe('City name.'),
    state: z.string().optional().describe('State or region.'),
    postal_code: z.string().optional().describe('Postal or ZIP code.'),
    country: z.string().describe('Country name or code.')
});

const AccountingFieldSelectionOutputSchema = z.object({
    id: z.string().describe('Unique identifier of the selected accounting field option.'),
    name: z.string().describe('Name of the accounting field option.'),
    display_name: z.string().describe('Customer-facing display name of the accounting field option.'),
    external_id: z.string().describe('External identifier of the accounting field option.'),
    external_code: z.string().optional().describe('External code of the accounting field option.'),
    provider_name: z.string().optional().describe('Name of the accounting provider.'),
    category_info: AccountingFieldSchema.describe('Accounting field this option belongs to.')
});

const LineItemOutputSchema = z.object({
    id: z.string().describe('Unique identifier of the line item.'),
    description: z.string().optional().describe('Description of the line item.'),
    quantity: z.number().optional().describe('Quantity of the line item.'),
    unit_price: CurrencyAmountSchema.optional().describe('Unit price of the line item.'),
    amount: CurrencyAmountSchema.describe('Total amount of the line item.'),
    start_date: z.string().optional().describe('Date when spending for this line item begins (YYYY-MM-DD).'),
    end_date: z.string().optional().describe('Date when spending for this line item ends (YYYY-MM-DD).'),
    external_id: z.string().optional().describe('Customer-provided external identifier of the line item.'),
    remote_id: z.string().optional().describe('Accounting remote identifier of the line item.'),
    withholding_rate: z.string().optional().describe('Line-level retainage withholding rate as a fractional decimal. Example: "0.10"'),
    accounting_field_selections: z.array(AccountingFieldSelectionOutputSchema).describe('Accounting field options selected to code this line item.')
});

const InputSchema = z
    .object({
        purchase_order_id: z.string().describe('Unique identifier of the purchase order to retrieve. Example: "01a139ea-1cb3-7c62-b234-c368a1c4d404"')
    })
    .describe('Identifier of the purchase order to retrieve.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the purchase order.'),
        purchase_order_number: z.string().optional().describe('Human-readable purchase order number. Example: "11018"'),
        name: z.string().optional().describe('Name of the purchase order.'),
        amount: CurrencyAmountSchema.describe('Total amount of the purchase order.'),
        spend_total_amount: CurrencyAmountSchema.optional().describe('Total amount of the purchase order calculated across its recurring date range.'),
        billing_status: z.string().optional().describe('Billing status of the purchase order. Example: "OPEN"'),
        receipt_status: z.string().describe('Receipt status of the purchase order. Example: "NOT_RECEIVED"'),
        creation_source: z.string().describe('How the purchase order was created. Example: "RAMP"'),
        three_way_match_enabled: z.boolean().describe('Whether three-way match is enabled for the purchase order.'),
        memo: z.string().optional().describe('Memo attached to the purchase order.'),
        external_id: z.string().optional().describe('Customer-provided external identifier of the purchase order.'),
        remote_id: z.string().optional().describe('Accounting remote identifier of the purchase order.'),
        vendor_id: z.string().optional().describe('Unique identifier of the vendor.'),
        entity_id: z.string().describe('Unique identifier of the associated business entity.'),
        owner_id: z.string().optional().describe('Unique identifier of the spend request owner.'),
        user_id: z.string().optional().describe('Unique identifier of the user who created the spend request.'),
        spend_program_id: z.string().optional().describe('Unique identifier of the associated spend program.'),
        spend_request_id: z.string().optional().describe('Unique identifier of the associated spend request.'),
        spend_start_date: z.string().optional().describe('Date when spending for this purchase order begins.'),
        spend_end_date: z.string().optional().describe('Date when spending for this purchase order ends.'),
        promise_date: z.string().optional().describe('Date the vendor will deliver the goods or services.'),
        archived_at: z.string().optional().describe('Timestamp when the purchase order was archived, if any.'),
        net_payment_terms: z.number().optional().describe('Number of days an invoice must be paid within after receipt.'),
        withholding_default_rate: z.string().optional().describe('Default retainage withholding rate as a fractional decimal. Example: "0.10"'),
        ramp_url: z.string().describe('Stable URL linking to the purchase order in the Ramp web application.'),
        ship_to_company_name: z.string().optional().describe('Company name associated with the delivery address.'),
        ship_to_address: AddressOutputSchema.optional().describe('Delivery address for the purchase order.'),
        shipping_contact_first_name: z.string().optional().describe('First name of the delivery contact.'),
        shipping_contact_last_name: z.string().optional().describe('Last name of the delivery contact.'),
        shipping_contact_email: z.string().optional().describe('Email address of the delivery contact.'),
        shipping_contact_phone_number: z.string().optional().describe('Phone number of the delivery contact.'),
        bill_ids: z.array(z.string()).describe('Unique identifiers of attached bills.'),
        transaction_ids: z.array(z.string()).describe('Unique identifiers of attached transactions (excluding transactions on attached bills).'),
        item_receipt_ids: z.array(z.string()).describe('Unique identifiers of item receipts matched to the purchase order.'),
        line_items: z.array(LineItemOutputSchema).describe('Line items on the purchase order.'),
        accounting_field_selections: z.array(AccountingFieldSelectionOutputSchema).describe('Accounting field options selected to code the purchase order.')
    })
    .describe('A single purchase order retrieved from Ramp.');

function toAddress(address: z.infer<typeof AddressSchema>): z.infer<typeof AddressOutputSchema> {
    return {
        address1: address.address1,
        city: address.city,
        country: address.country,
        ...(address.address2 != null && { address2: address.address2 }),
        ...(address.state != null && { state: address.state }),
        ...(address.postal_code != null && { postal_code: address.postal_code })
    };
}

function toAccountingFieldSelection(selection: z.infer<typeof AccountingFieldSelectionSchema>): z.infer<typeof AccountingFieldSelectionOutputSchema> {
    return {
        id: selection.id,
        name: selection.name,
        display_name: selection.display_name,
        external_id: selection.external_id,
        category_info: {
            id: selection.category_info.id,
            name: selection.category_info.name,
            external_id: selection.category_info.external_id,
            type: selection.category_info.type
        },
        ...(selection.external_code != null && { external_code: selection.external_code }),
        ...(selection.provider_name != null && { provider_name: selection.provider_name })
    };
}

function toLineItem(lineItem: z.infer<typeof ProviderLineItemSchema>): z.infer<typeof LineItemOutputSchema> {
    return {
        id: lineItem.id,
        amount: lineItem.amount,
        accounting_field_selections: lineItem.accounting_field_selections.map(toAccountingFieldSelection),
        ...(lineItem.description != null && { description: lineItem.description }),
        ...(lineItem.quantity != null && { quantity: lineItem.quantity }),
        ...(lineItem.unit_price != null && { unit_price: lineItem.unit_price }),
        ...(lineItem.start_date != null && { start_date: lineItem.start_date }),
        ...(lineItem.end_date != null && { end_date: lineItem.end_date }),
        ...(lineItem.external_id != null && { external_id: lineItem.external_id }),
        ...(lineItem.remote_id != null && { remote_id: lineItem.remote_id }),
        ...(lineItem.withholding_rate != null && { withholding_rate: lineItem.withholding_rate })
    };
}

/**
 * @tags: [read]
 * @tagReason: Reads a single purchase order from the provider and does not modify any provider state.
 * @pitfalls: Requires a Ramp Plus plan; purchase orders archived through the provider are permanently removed and cannot be retrieved.
 */
const action = createAction({
    description: 'Retrieve a single purchase order by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['purchase_orders:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/developer-api/v1/api/purchase-orders
            endpoint: `/developer/v1/purchase-orders/${encodeURIComponent(input.purchase_order_id)}`,
            retries: 3
        });

        const purchaseOrder = ProviderPurchaseOrderSchema.parse(response.data);

        return {
            id: purchaseOrder.id,
            amount: purchaseOrder.amount,
            receipt_status: purchaseOrder.receipt_status,
            creation_source: purchaseOrder.creation_source,
            three_way_match_enabled: purchaseOrder.three_way_match_enabled,
            entity_id: purchaseOrder.entity_id,
            ramp_url: purchaseOrder.ramp_url,
            bill_ids: purchaseOrder.bill_ids,
            transaction_ids: purchaseOrder.transaction_ids,
            item_receipt_ids: purchaseOrder.item_receipt_ids,
            line_items: purchaseOrder.line_items.map(toLineItem),
            accounting_field_selections: purchaseOrder.accounting_field_selections.map(toAccountingFieldSelection),
            ...(purchaseOrder.purchase_order_number != null && { purchase_order_number: purchaseOrder.purchase_order_number }),
            ...(purchaseOrder.name != null && { name: purchaseOrder.name }),
            ...(purchaseOrder.spend_total_amount != null && { spend_total_amount: purchaseOrder.spend_total_amount }),
            ...(purchaseOrder.billing_status != null && { billing_status: purchaseOrder.billing_status }),
            ...(purchaseOrder.memo != null && { memo: purchaseOrder.memo }),
            ...(purchaseOrder.external_id != null && { external_id: purchaseOrder.external_id }),
            ...(purchaseOrder.remote_id != null && { remote_id: purchaseOrder.remote_id }),
            ...(purchaseOrder.vendor_id != null && { vendor_id: purchaseOrder.vendor_id }),
            ...(purchaseOrder.owner_id != null && { owner_id: purchaseOrder.owner_id }),
            ...(purchaseOrder.user_id != null && { user_id: purchaseOrder.user_id }),
            ...(purchaseOrder.spend_program_id != null && { spend_program_id: purchaseOrder.spend_program_id }),
            ...(purchaseOrder.spend_request_id != null && { spend_request_id: purchaseOrder.spend_request_id }),
            ...(purchaseOrder.spend_start_date != null && { spend_start_date: purchaseOrder.spend_start_date }),
            ...(purchaseOrder.spend_end_date != null && { spend_end_date: purchaseOrder.spend_end_date }),
            ...(purchaseOrder.promise_date != null && { promise_date: purchaseOrder.promise_date }),
            ...(purchaseOrder.archived_at != null && { archived_at: purchaseOrder.archived_at }),
            ...(purchaseOrder.net_payment_terms != null && { net_payment_terms: purchaseOrder.net_payment_terms }),
            ...(purchaseOrder.withholding_default_rate != null && { withholding_default_rate: purchaseOrder.withholding_default_rate }),
            ...(purchaseOrder.ship_to_company_name != null && { ship_to_company_name: purchaseOrder.ship_to_company_name }),
            ...(purchaseOrder.ship_to_address != null && { ship_to_address: toAddress(purchaseOrder.ship_to_address) }),
            ...(purchaseOrder.shipping_contact_first_name != null && { shipping_contact_first_name: purchaseOrder.shipping_contact_first_name }),
            ...(purchaseOrder.shipping_contact_last_name != null && { shipping_contact_last_name: purchaseOrder.shipping_contact_last_name }),
            ...(purchaseOrder.shipping_contact_email != null && { shipping_contact_email: purchaseOrder.shipping_contact_email }),
            ...(purchaseOrder.shipping_contact_phone_number != null && { shipping_contact_phone_number: purchaseOrder.shipping_contact_phone_number })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
