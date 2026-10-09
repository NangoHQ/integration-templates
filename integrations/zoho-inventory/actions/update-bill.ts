import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const CustomFieldInputSchema = z.object({
    customfield_id: z.string().optional().describe('Unique ID of the custom field to set. Example: "46000000012845"'),
    label: z.string().optional().describe('Label of the custom field.'),
    value: z.string().optional().describe('Value to store in the custom field.')
});

const LineItemInputSchema = z.object({
    line_item_id: z.string().optional().describe('Unique ID of an existing line item to keep. Omit when adding a new line item.'),
    item_id: z.string().optional().describe('Unique ID of an inventory item. Omit for a non-catalog line item.'),
    name: z.string().optional().describe('Name of the line item. Example: "Office Supplies"'),
    account_id: z.string().optional().describe('Unique ID of the expense account for the line item.'),
    description: z.string().optional().describe('Description of the line item.'),
    rate: z.number().optional().describe('Purchase price per unit.'),
    quantity: z.number().optional().describe('Quantity of the item.'),
    unit: z.string().optional().describe('Unit of measurement. Example: "qty"'),
    tax_id: z.string().optional().describe('Unique ID of the tax applied to the line item.'),
    item_order: z.number().optional().describe('Position of the line item, starting from 0.')
});

const InputSchema = z
    .object({
        bill_id: z.string().describe('Unique ID of the vendor bill to update. Example: "260815000000163114"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            ),
        vendor_id: z.string().optional().describe('Unique ID of the vendor the bill belongs to.'),
        bill_number: z.string().optional().describe('Bill number shown to the vendor. Example: "BL-00002"'),
        date: z.string().optional().describe('Bill date in yyyy-MM-dd format. Example: "2026-10-09"'),
        due_date: z.string().optional().describe('Payment due date in yyyy-MM-dd format. Example: "2026-10-09"'),
        reference_number: z.string().nullable().optional().describe('Vendor reference number. Pass null to clear it.'),
        purchaseorder_id: z.string().optional().describe('Unique ID of the purchase order this bill is associated with.'),
        currency_id: z.string().optional().describe('Unique ID of the bill currency.'),
        exchange_rate: z.number().optional().describe('Exchange rate against the organization base currency.'),
        is_item_level_tax_calc: z.boolean().optional().describe('Whether tax is calculated at the item level.'),
        is_inclusive_tax: z.boolean().optional().describe('Whether line item rates are tax inclusive.'),
        notes: z.string().nullable().optional().describe('Notes shown on the bill. Pass null to clear them.'),
        terms: z.string().nullable().optional().describe('Terms and conditions shown on the bill. Pass null to clear them.'),
        custom_fields: z.array(CustomFieldInputSchema).optional().describe('Custom field values to set on the bill.'),
        line_items: z.array(LineItemInputSchema).optional().describe('Complete set of line items for the bill. Replaces all existing line items when provided.')
    })
    .describe('Fields to update on an existing Zoho Inventory vendor bill. Only the provided fields are changed.');

const BillLineItemSchema = z.object({
    line_item_id: z.string().describe('Unique ID of the line item.'),
    item_id: z.string().optional().describe('Unique ID of the inventory item, empty for non-catalog items.'),
    name: z.string().describe('Name of the line item.'),
    description: z.string().optional().describe('Description of the line item.'),
    account_id: z.string().optional().describe('Unique ID of the expense account.'),
    account_name: z.string().optional().describe('Name of the expense account.'),
    rate: z.number().describe('Purchase price per unit.'),
    quantity: z.number().describe('Quantity billed.'),
    unit: z.string().optional().describe('Unit of measurement.'),
    item_total: z.number().describe('Line total (rate multiplied by quantity).'),
    item_order: z.number().describe('Position of the line item in the bill.')
});

const OutputSchema = z
    .object({
        bill_id: z.string().describe('Unique ID of the updated bill.'),
        bill_number: z.string().describe('Bill number.'),
        status: z.string().describe('Bill status, for example "open", "paid", "overdue" or "void".'),
        vendor_id: z.string().describe('Unique ID of the vendor.'),
        vendor_name: z.string().describe('Name of the vendor.'),
        reference_number: z.string().optional().describe('Vendor reference number, empty when not set.'),
        date: z.string().describe('Bill date in yyyy-MM-dd format.'),
        due_date: z.string().describe('Payment due date in yyyy-MM-dd format.'),
        currency_id: z.string().describe('Unique ID of the bill currency.'),
        currency_code: z.string().optional().describe('ISO currency code. Example: "USD"'),
        exchange_rate: z.number().describe('Exchange rate against the organization base currency.'),
        sub_total: z.number().describe('Bill subtotal before taxes and discounts.'),
        total: z.number().describe('Bill total.'),
        balance: z.number().describe('Outstanding balance still due.'),
        notes: z.string().optional().describe('Notes on the bill.'),
        terms: z.string().optional().describe('Terms and conditions on the bill.'),
        purchaseorder_ids: z.array(z.string()).optional().describe('IDs of the purchase orders the bill is associated with.'),
        line_items: z.array(BillLineItemSchema).describe('Line items on the updated bill.'),
        created_time: z.string().optional().describe('Creation timestamp in the organization time zone.'),
        last_modified_time: z.string().optional().describe('Last modification timestamp in the organization time zone.')
    })
    .describe('The vendor bill after the update was applied.');

const ProviderLineItemSchema = z.object({
    line_item_id: z.string().nullish(),
    item_id: z.string().nullish(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    account_id: z.string().nullish(),
    account_name: z.string().nullish(),
    rate: z.number().nullish(),
    quantity: z.number().nullish(),
    unit: z.string().nullish(),
    item_total: z.number().nullish(),
    item_order: z.number().nullish()
});

const ProviderBillSchema = z.object({
    bill_id: z.string(),
    bill_number: z.string().nullish(),
    status: z.string().nullish(),
    vendor_id: z.string().nullish(),
    vendor_name: z.string().nullish(),
    reference_number: z.string().nullish(),
    date: z.string().nullish(),
    due_date: z.string().nullish(),
    currency_id: z.string().nullish(),
    currency_code: z.string().nullish(),
    exchange_rate: z.number().nullish(),
    sub_total: z.number().nullish(),
    total: z.number().nullish(),
    balance: z.number().nullish(),
    notes: z.string().nullish(),
    terms: z.string().nullish(),
    line_items: z.array(ProviderLineItemSchema).nullish(),
    created_time: z.string().nullish(),
    last_modified_time: z.string().nullish(),
    purchaseorder_ids: z.array(z.string()).nullish()
});

const ProviderEnvelopeSchema = z.object({
    code: z.number(),
    message: z.string().nullish()
});

const ProviderResponseSchema = ProviderEnvelopeSchema.extend({
    bill: ProviderBillSchema
});

/**
 * @tags: [write]
 * @tagReason: Mutates an existing vendor bill's fields and line items through the provider.
 * @pitfalls: Providing line_items replaces the bill's entire line-item set (existing line-item IDs are discarded and new ones assigned), so include every line item that should remain; passing null for a clearable string field clears it.
 */
const action = createAction({
    description: 'Update an existing vendor bill in Zoho Inventory.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.bills.UPDATE', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const response = await nango.put({
            // https://www.zoho.com/inventory/api/v1/bills/#update-a-bill
            endpoint: `/inventory/v1/bills/${encodeURIComponent(input.bill_id)}`,
            params: {
                organization_id: organizationId
            },
            data: {
                ...(input.vendor_id !== undefined && { vendor_id: input.vendor_id }),
                ...(input.bill_number !== undefined && { bill_number: input.bill_number }),
                ...(input.date !== undefined && { date: input.date }),
                ...(input.due_date !== undefined && { due_date: input.due_date }),
                ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
                ...(input.purchaseorder_id !== undefined && { purchaseorder_id: input.purchaseorder_id }),
                ...(input.currency_id !== undefined && { currency_id: input.currency_id }),
                ...(input.exchange_rate !== undefined && { exchange_rate: input.exchange_rate }),
                ...(input.is_item_level_tax_calc !== undefined && { is_item_level_tax_calc: input.is_item_level_tax_calc }),
                ...(input.is_inclusive_tax !== undefined && { is_inclusive_tax: input.is_inclusive_tax }),
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.terms !== undefined && { terms: input.terms }),
                ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields }),
                ...(input.line_items !== undefined && { line_items: input.line_items })
            },
            retries: 3
        });

        const envelope = ProviderEnvelopeSchema.safeParse(response.data);
        if (!envelope.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when updating a bill.',
                details: envelope.error.message
            });
        }

        if (envelope.data.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: envelope.data.message ?? 'Zoho Inventory failed to update the bill.',
                code: envelope.data.code
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected bill payload from Zoho Inventory API when updating a bill.',
                details: parsed.error.message
            });
        }

        const bill = parsed.data.bill;

        const lineItems = (bill.line_items ?? []).map((item) => ({
            line_item_id: item.line_item_id ?? '',
            ...(item.item_id != null && { item_id: item.item_id }),
            name: item.name ?? '',
            ...(item.description != null && { description: item.description }),
            ...(item.account_id != null && { account_id: item.account_id }),
            ...(item.account_name != null && { account_name: item.account_name }),
            rate: item.rate ?? 0,
            quantity: item.quantity ?? 0,
            ...(item.unit != null && { unit: item.unit }),
            item_total: item.item_total ?? 0,
            item_order: item.item_order ?? 0
        }));

        return {
            bill_id: bill.bill_id,
            bill_number: bill.bill_number ?? '',
            status: bill.status ?? '',
            vendor_id: bill.vendor_id ?? '',
            vendor_name: bill.vendor_name ?? '',
            ...(bill.reference_number != null && { reference_number: bill.reference_number }),
            date: bill.date ?? '',
            due_date: bill.due_date ?? '',
            currency_id: bill.currency_id ?? '',
            ...(bill.currency_code != null && { currency_code: bill.currency_code }),
            exchange_rate: bill.exchange_rate ?? 0,
            sub_total: bill.sub_total ?? 0,
            total: bill.total ?? 0,
            balance: bill.balance ?? 0,
            ...(bill.notes != null && { notes: bill.notes }),
            ...(bill.terms != null && { terms: bill.terms }),
            ...(bill.purchaseorder_ids != null && { purchaseorder_ids: bill.purchaseorder_ids }),
            line_items: lineItems,
            ...(bill.created_time != null && { created_time: bill.created_time }),
            ...(bill.last_modified_time != null && { last_modified_time: bill.last_modified_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
