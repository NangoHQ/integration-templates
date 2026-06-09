import { z } from 'zod';
import { createAction } from 'nango';

const LineItemInputSchema = z.object({
    line_item_id: z.string().optional().describe('Existing line item ID to update; omit to create a new line.'),
    item_id: z.string().optional().describe('Item ID. Example: "260815000000100002"'),
    account_id: z.string().optional().describe('Account ID for the line item.'),
    name: z.string().optional().describe('Name of the line item.'),
    description: z.string().optional().describe('Description of the line item.'),
    rate: z.number().optional().describe('Rate per unit.'),
    quantity: z.number().optional().describe('Quantity ordered.'),
    unit: z.string().optional().describe('Unit of measure.'),
    tax_id: z.string().optional().describe('Tax ID applicable to the line item.'),
    item_order: z.number().optional().describe('Display order of the line item.')
});

const InputSchema = z.object({
    purchaseorder_id: z.string().describe('ID of the purchase order to update. Example: "260815000000062001"'),
    vendor_id: z.string().describe('Vendor ID. Example: "260815000000098001"'),
    line_items: z.array(LineItemInputSchema).min(1).describe('Line items for the purchase order.'),
    purchaseorder_number: z.string().optional().describe('Purchase order number.'),
    reference_number: z.string().optional().describe('Reference number.'),
    date: z.string().optional().describe('Purchase order date (YYYY-MM-DD).'),
    delivery_date: z.string().optional().describe('Expected delivery date (YYYY-MM-DD).'),
    due_date: z.string().optional().describe('Due date (YYYY-MM-DD).'),
    currency_id: z.string().optional().describe('Currency ID. Example: "260815000000000097"'),
    exchange_rate: z.number().optional().describe('Exchange rate for the currency.'),
    notes: z.string().optional().describe('Notes for the vendor.'),
    terms: z.string().optional().describe('Terms and conditions.'),
    discount: z.string().optional().describe('Discount percentage or amount.'),
    is_discount_before_tax: z.boolean().optional().describe('Whether discount is applied before tax.'),
    ship_via: z.string().optional().describe('Shipping method.'),
    attention: z.string().optional().describe('Attention field.'),
    is_inclusive_tax: z.boolean().optional().describe('Whether tax is inclusive.'),
    custom_fields: z
        .array(
            z.object({
                customfield_id: z.string(),
                value: z.string()
            })
        )
        .optional()
        .describe('Custom fields.'),
    tags: z
        .array(
            z.object({
                tag_id: z.string(),
                tag_option_id: z.string()
            })
        )
        .optional()
        .describe('Tags.')
});

const ProviderLineItemSchema = z.object({
    line_item_id: z.string().optional(),
    item_id: z.string().optional(),
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    rate: z.number().optional(),
    quantity: z.number().optional(),
    unit: z.string().optional(),
    tax_id: z.string().optional(),
    tax_name: z.string().optional(),
    tax_percentage: z.number().optional(),
    item_total: z.number().optional(),
    item_order: z.number().optional()
});

const ProviderPurchaseOrderSchema = z.object({
    purchaseorder_id: z.string(),
    purchaseorder_number: z.string().optional(),
    date: z.string().optional(),
    expected_delivery_date: z.string().optional(),
    delivery_date: z.string().optional(),
    due_date: z.string().optional(),
    status: z.string().optional(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    exchange_rate: z.number().optional(),
    reference_number: z.string().optional(),
    notes: z.string().optional(),
    terms: z.string().optional(),
    sub_total: z.number().optional(),
    tax_total: z.number().optional(),
    total: z.number().optional(),
    discount: z.union([z.string(), z.number()]).optional(),
    is_discount_before_tax: z.boolean().optional(),
    is_inclusive_tax: z.boolean().optional(),
    line_items: z.array(ProviderLineItemSchema).optional(),
    custom_fields: z
        .array(
            z.object({
                customfield_id: z.string(),
                value: z.string()
            })
        )
        .optional(),
    tags: z
        .array(
            z.object({
                tag_id: z.string(),
                tag_name: z.string().optional(),
                tag_option_id: z.string(),
                tag_option_name: z.string().optional()
            })
        )
        .optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    purchaseorder: ProviderPurchaseOrderSchema.optional()
});

const OutputSchema = z.object({
    purchaseorder_id: z.string(),
    purchaseorder_number: z.string().optional(),
    date: z.string().optional(),
    expected_delivery_date: z.string().optional(),
    delivery_date: z.string().optional(),
    due_date: z.string().optional(),
    status: z.string().optional(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    exchange_rate: z.number().optional(),
    reference_number: z.string().optional(),
    notes: z.string().optional(),
    terms: z.string().optional(),
    sub_total: z.number().optional(),
    tax_total: z.number().optional(),
    total: z.number().optional(),
    discount: z.union([z.string(), z.number()]).optional(),
    is_discount_before_tax: z.boolean().optional(),
    is_inclusive_tax: z.boolean().optional(),
    line_items: z.array(ProviderLineItemSchema).optional(),
    custom_fields: z
        .array(
            z.object({
                customfield_id: z.string(),
                value: z.string()
            })
        )
        .optional(),
    tags: z
        .array(
            z.object({
                tag_id: z.string(),
                tag_name: z.string().optional(),
                tag_option_id: z.string(),
                tag_option_name: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Update a purchase order in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-purchase-order',
        group: 'Purchase Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.purchaseorders.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = '927270289';

        const lineItems = input.line_items.map((item) => ({
            ...(item.line_item_id !== undefined && { line_item_id: item.line_item_id }),
            ...(item.item_id !== undefined && { item_id: item.item_id }),
            ...(item.account_id !== undefined && { account_id: item.account_id }),
            ...(item.name !== undefined && { name: item.name }),
            ...(item.description !== undefined && { description: item.description }),
            ...(item.rate !== undefined && { rate: item.rate }),
            ...(item.quantity !== undefined && { quantity: item.quantity }),
            ...(item.unit !== undefined && { unit: item.unit }),
            ...(item.tax_id !== undefined && { tax_id: item.tax_id }),
            ...(item.item_order !== undefined && { item_order: item.item_order })
        }));

        const data: Record<string, unknown> = {
            vendor_id: input.vendor_id,
            line_items: lineItems,
            ...(input.purchaseorder_number !== undefined && { purchaseorder_number: input.purchaseorder_number }),
            ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
            ...(input.date !== undefined && { date: input.date }),
            ...(input.delivery_date !== undefined && { delivery_date: input.delivery_date }),
            ...(input.due_date !== undefined && { due_date: input.due_date }),
            ...(input.currency_id !== undefined && { currency_id: input.currency_id }),
            ...(input.exchange_rate !== undefined && { exchange_rate: input.exchange_rate }),
            ...(input.notes !== undefined && { notes: input.notes }),
            ...(input.terms !== undefined && { terms: input.terms }),
            ...(input.discount !== undefined && { discount: input.discount }),
            ...(input.is_discount_before_tax !== undefined && { is_discount_before_tax: input.is_discount_before_tax }),
            ...(input.ship_via !== undefined && { ship_via: input.ship_via }),
            ...(input.attention !== undefined && { attention: input.attention }),
            ...(input.is_inclusive_tax !== undefined && { is_inclusive_tax: input.is_inclusive_tax }),
            ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields }),
            ...(input.tags !== undefined && { tags: input.tags })
        };

        const response = await nango.put({
            // https://www.zoho.com/books/api/v3/purchase-order/#update-a-purchase-order
            endpoint: `/books/v3/purchaseorders/${encodeURIComponent(input.purchaseorder_id)}`,
            params: {
                organization_id: organizationId
            },
            data,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0 || !providerResponse.purchaseorder) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message || 'Failed to update purchase order.',
                code: providerResponse.code
            });
        }

        const po = providerResponse.purchaseorder;

        return {
            purchaseorder_id: po.purchaseorder_id,
            ...(po.purchaseorder_number !== undefined && { purchaseorder_number: po.purchaseorder_number }),
            ...(po.date !== undefined && { date: po.date }),
            ...(po.expected_delivery_date !== undefined && { expected_delivery_date: po.expected_delivery_date }),
            ...(po.delivery_date !== undefined && { delivery_date: po.delivery_date }),
            ...(po.due_date !== undefined && { due_date: po.due_date }),
            ...(po.status !== undefined && { status: po.status }),
            ...(po.vendor_id !== undefined && { vendor_id: po.vendor_id }),
            ...(po.vendor_name !== undefined && { vendor_name: po.vendor_name }),
            ...(po.currency_id !== undefined && { currency_id: po.currency_id }),
            ...(po.currency_code !== undefined && { currency_code: po.currency_code }),
            ...(po.exchange_rate !== undefined && { exchange_rate: po.exchange_rate }),
            ...(po.reference_number !== undefined && { reference_number: po.reference_number }),
            ...(po.notes !== undefined && { notes: po.notes }),
            ...(po.terms !== undefined && { terms: po.terms }),
            ...(po.sub_total !== undefined && { sub_total: po.sub_total }),
            ...(po.tax_total !== undefined && { tax_total: po.tax_total }),
            ...(po.total !== undefined && { total: po.total }),
            ...(po.discount !== undefined && { discount: po.discount }),
            ...(po.is_discount_before_tax !== undefined && { is_discount_before_tax: po.is_discount_before_tax }),
            ...(po.is_inclusive_tax !== undefined && { is_inclusive_tax: po.is_inclusive_tax }),
            ...(po.line_items !== undefined && { line_items: po.line_items }),
            ...(po.custom_fields !== undefined && { custom_fields: po.custom_fields }),
            ...(po.tags !== undefined && { tags: po.tags })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
