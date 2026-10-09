import { z } from 'zod';
import { createAction } from 'nango';

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
        organization_id: z.string().optional().describe('Unique ID of the Zoho Inventory organization. Defaults to the first organization on the connection.'),
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
        line_items: z.array(BillLineItemSchema).describe('Line items on the updated bill.'),
        created_time: z.string().optional().describe('Creation timestamp in the organization time zone.'),
        last_modified_time: z.string().optional().describe('Last modification timestamp in the organization time zone.')
    })
    .describe('The vendor bill after the update was applied.');

const ProviderLineItemSchema = z.object({
    line_item_id: z.string().optional(),
    item_id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    rate: z.number().optional(),
    quantity: z.number().optional(),
    unit: z.string().optional(),
    item_total: z.number().optional(),
    item_order: z.number().optional()
});

const ProviderBillSchema = z.object({
    bill_id: z.string(),
    bill_number: z.string().optional(),
    status: z.string().optional(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    reference_number: z.string().optional(),
    date: z.string().optional(),
    due_date: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    exchange_rate: z.number().optional(),
    sub_total: z.number().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    notes: z.string().optional(),
    terms: z.string().optional(),
    line_items: z.array(ProviderLineItemSchema).optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    bill: ProviderBillSchema
});

const OrganizationsResponseSchema = z.object({
    organizations: z.array(
        z.object({
            organization_id: z.string()
        })
    )
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

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;

        if (organizationId === undefined) {
            const organizationsResponse = await nango.get({
                // https://www.zoho.com/inventory/api/v1/organizations/#list-organizations
                endpoint: '/inventory/v1/organizations',
                retries: 3
            });

            const organizations = OrganizationsResponseSchema.parse(organizationsResponse.data).organizations;
            const firstOrganization = organizations[0];

            if (firstOrganization === undefined) {
                throw new nango.ActionError({
                    type: 'no_organization',
                    message: 'No Zoho Inventory organization is available for this connection.'
                });
            }

            organizationId = firstOrganization.organization_id;
        }

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

        const bill = ProviderResponseSchema.parse(response.data).bill;

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
            line_items: lineItems,
            ...(bill.created_time != null && { created_time: bill.created_time }),
            ...(bill.last_modified_time != null && { last_modified_time: bill.last_modified_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
