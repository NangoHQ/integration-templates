import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const BillLineItemInputSchema = z.object({
    item_id: z.string().describe('Unique ID of the item being billed. Must be a sales_and_purchases-type item. Example: "260815000000131008"'),
    quantity: z.number().describe('Quantity of the item billed. Example: 2'),
    rate: z.number().optional().describe("Purchase price per unit of the item. Defaults to the item's purchase rate when omitted. Example: 40"),
    description: z.string().optional().describe('Free-text description for the line item.'),
    tax_id: z.string().optional().describe('Unique ID of the tax applied to the line item.')
});

const InputSchema = z
    .object({
        vendor_id: z.string().describe('Unique ID of the vendor the bill is owed to. Example: "260815000000098001"'),
        bill_number: z.string().describe('Bill number identifying this bill. Example: "BL-00002"'),
        line_items: z.array(BillLineItemInputSchema).min(1).describe('One or more line items for the bill.'),
        date: z.string().optional().describe('Bill date in yyyy-MM-dd format. Example: "2026-10-09"'),
        due_date: z.string().optional().describe('Due date for the bill in yyyy-MM-dd format. Example: "2026-10-09"'),
        purchaseorder_id: z.string().optional().describe('Unique ID of an existing purchase order to bill against. Example: "260815000000104001"'),
        reference_number: z.string().optional().describe('External reference number for the bill. Example: "PO-00003"'),
        notes: z.string().optional().describe('Notes to record on the bill.'),
        terms: z.string().optional().describe('Terms and conditions for the bill.'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Input for creating a vendor bill.');

const ProviderLineItemSchema = z.object({
    line_item_id: z.union([z.string(), z.number()]).nullable().optional(),
    item_id: z.union([z.string(), z.number()]).nullable().optional(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    quantity: z.number().nullable().optional(),
    rate: z.number().nullable().optional(),
    item_total: z.number().nullable().optional(),
    unit: z.string().nullable().optional()
});

const ProviderBillSchema = z.object({
    bill_id: z.union([z.string(), z.number()]),
    bill_number: z.string().nullable().optional(),
    vendor_id: z.union([z.string(), z.number()]).nullable().optional(),
    vendor_name: z.string().nullable().optional(),
    purchaseorder_ids: z
        .array(z.union([z.string(), z.number()]))
        .nullable()
        .optional(),
    status: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    reference_number: z.string().nullable().optional(),
    currency_code: z.string().nullable().optional(),
    sub_total: z.number().nullable().optional(),
    tax_total: z.number().nullable().optional(),
    total: z.number().nullable().optional(),
    balance: z.number().nullable().optional(),
    line_items: z.array(ProviderLineItemSchema).nullable().optional(),
    created_time: z.string().nullable().optional(),
    last_modified_time: z.string().nullable().optional()
});

const ProviderEnvelopeSchema = z.object({
    code: z.number(),
    message: z.string()
});

const ProviderResponseSchema = ProviderEnvelopeSchema.extend({
    bill: ProviderBillSchema
});

const OutputLineItemSchema = z.object({
    line_item_id: z.string().optional().describe('Unique ID of the created line item.'),
    item_id: z.string().optional().describe('Unique ID of the billed item.'),
    name: z.string().optional().describe('Name of the billed item.'),
    description: z.string().optional().describe('Description of the line item.'),
    quantity: z.number().optional().describe('Quantity of the item billed.'),
    rate: z.number().optional().describe('Purchase price per unit of the item.'),
    item_total: z.number().optional().describe('Total amount for the line item.'),
    unit: z.string().optional().describe('Unit of measurement for the item.')
});

const OutputSchema = z
    .object({
        bill_id: z.string().describe('Unique ID of the created bill.'),
        bill_number: z.string().optional().describe('Bill number identifying the bill.'),
        vendor_id: z.string().optional().describe('Unique ID of the vendor the bill is owed to.'),
        vendor_name: z.string().optional().describe('Name of the vendor the bill is owed to.'),
        purchaseorder_ids: z
            .array(z.string())
            .optional()
            .describe('IDs of the purchase orders the bill is associated with; empty when the bill was not created against a purchase order.'),
        status: z.string().optional().describe('Status of the bill. Bills are created directly in open status.'),
        date: z.string().optional().describe('Bill date in yyyy-MM-dd format.'),
        due_date: z.string().optional().describe('Due date for the bill in yyyy-MM-dd format.'),
        reference_number: z.string().optional().describe('External reference number for the bill.'),
        currency_code: z.string().optional().describe('Currency code of the bill.'),
        sub_total: z.number().optional().describe('Sum of the line item totals before tax.'),
        tax_total: z.number().optional().describe('Total tax applied to the bill.'),
        total: z.number().optional().describe('Total amount of the bill including tax.'),
        balance: z.number().optional().describe('Outstanding balance still owed on the bill.'),
        line_items: z.array(OutputLineItemSchema).optional().describe('Line items recorded on the bill.'),
        created_time: z.string().optional().describe('Timestamp when the bill was created.'),
        last_modified_time: z.string().optional().describe('Timestamp when the bill was last modified.')
    })
    .describe('The newly created vendor bill.');

/**
 * @tags: [write]
 * @tagReason: Creates a new vendor bill in the provider.
 * @pitfalls: Bills are created directly in "open" status, not "draft"; date and due_date are documented as required but default to the current date when omitted; and each line item's item_id must reference a sales_and_purchases-type item or the provider rejects the bill.
 */
const action = createAction({
    description: 'Create a new vendor bill.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.bills.CREATE', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const response = await nango.post({
            // https://www.zoho.com/inventory/api/v1/bills/#create-a-bill
            endpoint: '/inventory/v1/bills',
            params: {
                organization_id: organizationId
            },
            data: {
                vendor_id: input.vendor_id,
                bill_number: input.bill_number,
                line_items: input.line_items.map((lineItem) => ({
                    item_id: lineItem.item_id,
                    quantity: lineItem.quantity,
                    ...(lineItem.rate !== undefined && { rate: lineItem.rate }),
                    ...(lineItem.description !== undefined && { description: lineItem.description }),
                    ...(lineItem.tax_id !== undefined && { tax_id: lineItem.tax_id })
                })),
                ...(input.date !== undefined && { date: input.date }),
                ...(input.due_date !== undefined && { due_date: input.due_date }),
                ...(input.purchaseorder_id !== undefined && { purchaseorder_id: input.purchaseorder_id }),
                ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.terms !== undefined && { terms: input.terms })
            },
            // Creating a bill is not idempotent; a retry after a lost response would create a duplicate bill.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const envelope = ProviderEnvelopeSchema.safeParse(response.data);
        if (!envelope.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when creating a bill.',
                details: envelope.error.message
            });
        }

        if (envelope.data.code !== 0) {
            throw new nango.ActionError({ type: 'provider_error', message: envelope.data.message, code: envelope.data.code });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected bill payload from Zoho Inventory API when creating a bill.',
                details: parsed.error.message
            });
        }

        const bill = parsed.data.bill;

        return {
            bill_id: String(bill.bill_id),
            ...(bill.bill_number != null && { bill_number: bill.bill_number }),
            ...(bill.vendor_id != null && { vendor_id: String(bill.vendor_id) }),
            ...(bill.vendor_name != null && { vendor_name: bill.vendor_name }),
            ...(bill.purchaseorder_ids != null && { purchaseorder_ids: bill.purchaseorder_ids.map((id) => String(id)) }),
            ...(bill.status != null && { status: bill.status }),
            ...(bill.date != null && { date: bill.date }),
            ...(bill.due_date != null && { due_date: bill.due_date }),
            ...(bill.reference_number != null && { reference_number: bill.reference_number }),
            ...(bill.currency_code != null && { currency_code: bill.currency_code }),
            ...(bill.sub_total != null && { sub_total: bill.sub_total }),
            ...(bill.tax_total != null && { tax_total: bill.tax_total }),
            ...(bill.total != null && { total: bill.total }),
            ...(bill.balance != null && { balance: bill.balance }),
            ...(bill.line_items != null && {
                line_items: bill.line_items.map((lineItem) => ({
                    ...(lineItem.line_item_id != null && { line_item_id: String(lineItem.line_item_id) }),
                    ...(lineItem.item_id != null && { item_id: String(lineItem.item_id) }),
                    ...(lineItem.name != null && { name: lineItem.name }),
                    ...(lineItem.description != null && { description: lineItem.description }),
                    ...(lineItem.quantity != null && { quantity: lineItem.quantity }),
                    ...(lineItem.rate != null && { rate: lineItem.rate }),
                    ...(lineItem.item_total != null && { item_total: lineItem.item_total }),
                    ...(lineItem.unit != null && { unit: lineItem.unit })
                }))
            }),
            ...(bill.created_time != null && { created_time: bill.created_time }),
            ...(bill.last_modified_time != null && { last_modified_time: bill.last_modified_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
