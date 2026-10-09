import { z } from 'zod';
import { createAction } from 'nango';

const LineItemSchema = z.object({
    item_id: z.string().optional().describe('Catalog item ID. Optional: ad-hoc line items work without it. Example: "260815000000000097".'),
    name: z.string().optional().describe('Name of the line item. Example: "Consulting hours".'),
    description: z.string().optional().describe('Description of the line item.'),
    quantity: z.number().optional().describe('Quantity of the item. Example: 1.'),
    rate: z.number().optional().describe('Unit rate of the item. Example: 75.'),
    tax_id: z.string().optional().describe('ID of a tax to apply to the line item.'),
    project_id: z.string().optional().describe('ID of the project associated with the line item.')
});

const CustomFieldSchema = z.object({
    label: z.string().describe('Label of the custom field. Example: "PO Number".'),
    value: z.string().describe('Value of the custom field. Example: "PO-123".')
});

const InputSchema = z
    .object({
        creditnote_id: z.string().describe('ID of the credit note to update. Example: "260815000000164023".'),
        organization_id: z
            .string()
            .describe('ID of the Zoho Invoice organization. Required because this connection cannot look organizations up. Example: "927270289".'),
        customer_id: z.string().optional().describe('ID of the customer the credit note is raised for.'),
        date: z.string().optional().describe('Date the credit note is raised, in yyyy-mm-dd format. Example: "2026-10-09".'),
        line_items: z
            .array(LineItemSchema)
            .optional()
            .describe('Full list of line items for the credit note. Supplying this replaces every existing line item, so include all items you want to keep.'),
        exchange_rate: z.string().optional().describe('Exchange rate for the currency associated with the customer. Example: "1".'),
        reference_number: z.string().optional().describe('Reference number of the credit note. Maximum length 100.'),
        notes: z.string().optional().describe('Notes to display on the credit note. Maximum length 5000.'),
        terms: z.string().optional().describe('Terms and conditions to display on the credit note. Maximum length 10000.'),
        custom_fields: z.array(CustomFieldSchema).optional().describe('Custom field label/value pairs for the credit note.'),
        template_id: z.string().optional().describe('ID of the credit note template to use.'),
        creditnote_number: z.string().optional().describe('Custom credit note number to use together with ignore_auto_number_generation. Maximum length 100.'),
        ignore_auto_number_generation: z.boolean().optional().describe('Set true to use your own creditnote_number instead of the auto-generated one.')
    })
    .describe('Fields to update on an existing Zoho Invoice credit note. Only supplied fields are changed.');

const ProviderLineItemSchema = z.object({
    line_item_id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().optional(),
    rate: z.number().optional(),
    item_total: z.number().optional()
});

const ProviderCreditNoteSchema = z.object({
    creditnote_id: z.string(),
    creditnote_number: z.string().optional(),
    status: z.string().optional(),
    date: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    reference_number: z.string().optional(),
    notes: z.string().optional(),
    terms: z.string().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    currency_code: z.string().optional(),
    last_modified_time: z.string().optional(),
    line_items: z.array(ProviderLineItemSchema).optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    creditnote: ProviderCreditNoteSchema
});

const OutputLineItemSchema = z.object({
    line_item_id: z.string().optional().describe('Provider ID of the line item.'),
    name: z.string().optional().describe('Name of the line item.'),
    description: z.string().optional().describe('Description of the line item.'),
    quantity: z.number().optional().describe('Quantity of the line item.'),
    rate: z.number().optional().describe('Unit rate of the line item.'),
    item_total: z.number().optional().describe('Line total (rate multiplied by quantity).')
});

const OutputSchema = z
    .object({
        creditnote_id: z.string().describe('ID of the updated credit note.'),
        creditnote_number: z.string().optional().describe('Credit note number. Example: "CN-00010".'),
        status: z.string().optional().describe('Status of the credit note: "open", "closed" or "void".'),
        date: z.string().optional().describe('Date the credit note is raised, in yyyy-mm-dd format.'),
        customer_id: z.string().optional().describe('ID of the customer the credit note belongs to.'),
        customer_name: z.string().optional().describe('Name of the customer the credit note belongs to.'),
        reference_number: z.string().optional().describe('Reference number of the credit note.'),
        notes: z.string().optional().describe('Notes on the credit note.'),
        terms: z.string().optional().describe('Terms and conditions on the credit note.'),
        total: z.number().optional().describe('Total credit amount. Example: 75.'),
        balance: z.number().optional().describe('Unapplied credit balance. Example: 75.'),
        currency_code: z.string().optional().describe('Currency code of the credit note. Example: "USD".'),
        last_modified_time: z.string().optional().describe('Time the credit note was last modified. Example: "2026-10-09T13:36:08-0400".'),
        line_items: z.array(OutputLineItemSchema).optional().describe('Line items on the updated credit note.')
    })
    .describe('The credit note as returned by Zoho Invoice after the update.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing credit note through the provider's PUT endpoint; it mutates provider state without deleting or irreversibly clearing data.
 * @pitfalls: Supplying line_items replaces the entire existing line-item list, so include every line item you want to keep; omitting it (and other fields) leaves the existing values unchanged.
 */
const action = createAction({
    description: "Update an existing credit note's customer, line items, or other fields.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.creditnotes.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};
        if (input.customer_id !== undefined) {
            data['customer_id'] = input.customer_id;
        }
        if (input.date !== undefined) {
            data['date'] = input.date;
        }
        if (input.line_items !== undefined) {
            data['line_items'] = input.line_items;
        }
        if (input.exchange_rate !== undefined) {
            data['exchange_rate'] = input.exchange_rate;
        }
        if (input.reference_number !== undefined) {
            data['reference_number'] = input.reference_number;
        }
        if (input.notes !== undefined) {
            data['notes'] = input.notes;
        }
        if (input.terms !== undefined) {
            data['terms'] = input.terms;
        }
        if (input.custom_fields !== undefined) {
            data['custom_fields'] = input.custom_fields;
        }
        if (input.template_id !== undefined) {
            data['template_id'] = input.template_id;
        }
        if (input.creditnote_number !== undefined) {
            data['creditnote_number'] = input.creditnote_number;
        }
        if (input.ignore_auto_number_generation !== undefined) {
            data['ignore_auto_number_generation'] = input.ignore_auto_number_generation;
        }

        const response = await nango.put({
            // https://www.zoho.com/invoice/api/v3/credit-notes/#update-a-credit-note
            endpoint: `/invoice/v3/creditnotes/${encodeURIComponent(input.creditnote_id)}`,
            params: {
                organization_id: input.organization_id
            },
            data,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const creditnote = parsed.creditnote;

        return {
            creditnote_id: creditnote.creditnote_id,
            ...(creditnote.creditnote_number !== undefined && { creditnote_number: creditnote.creditnote_number }),
            ...(creditnote.status !== undefined && { status: creditnote.status }),
            ...(creditnote.date !== undefined && { date: creditnote.date }),
            ...(creditnote.customer_id !== undefined && { customer_id: creditnote.customer_id }),
            ...(creditnote.customer_name !== undefined && { customer_name: creditnote.customer_name }),
            ...(creditnote.reference_number !== undefined && { reference_number: creditnote.reference_number }),
            ...(creditnote.notes !== undefined && { notes: creditnote.notes }),
            ...(creditnote.terms !== undefined && { terms: creditnote.terms }),
            ...(creditnote.total !== undefined && { total: creditnote.total }),
            ...(creditnote.balance !== undefined && { balance: creditnote.balance }),
            ...(creditnote.currency_code !== undefined && { currency_code: creditnote.currency_code }),
            ...(creditnote.last_modified_time !== undefined && { last_modified_time: creditnote.last_modified_time }),
            ...(creditnote.line_items !== undefined && {
                line_items: creditnote.line_items.map((item) => ({
                    ...(item.line_item_id !== undefined && { line_item_id: item.line_item_id }),
                    ...(item.name !== undefined && { name: item.name }),
                    ...(item.description !== undefined && { description: item.description }),
                    ...(item.quantity !== undefined && { quantity: item.quantity }),
                    ...(item.rate !== undefined && { rate: item.rate }),
                    ...(item.item_total !== undefined && { item_total: item.item_total })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
