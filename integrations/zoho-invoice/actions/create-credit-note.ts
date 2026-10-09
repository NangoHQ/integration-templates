import { z } from 'zod';
import { createAction } from 'nango';

const LineItemInputSchema = z.object({
    item_id: z.string().optional().describe('Catalog item ID to credit. Optional because ad-hoc free-text line items are supported.'),
    name: z.string().optional().describe('Name or title of the credited product or service. At least one of name or description is required.'),
    description: z.string().optional().describe('Description of the credited product or service. At least one of name or description is required.'),
    rate: z.number().optional().describe('Unit rate of the line item. Defaults to 0 when omitted.'),
    quantity: z.number().optional().describe('Number of units credited. Defaults to 1 when omitted.'),
    unit: z.string().optional().describe('Unit of measure for the quantity, for example "hours" or "pcs".'),
    discount: z.number().optional().describe('Discount percentage applied to the line item.'),
    tax_id: z.string().optional().describe('Tax ID applied to the line item.'),
    account_id: z.string().optional().describe('Chart-of-accounts ID the line item is posted to.'),
    project_id: z.string().optional().describe('Project ID the line item is associated with.')
});

const InputSchema = z
    .object({
        organization_id: z.string().describe('Zoho Invoice organization ID that owns the credit note. Example: "927270289".'),
        customer_id: z.string().describe('Contact ID of the customer the credit note is issued to. Example: "260815000000097001".'),
        line_items: z.array(LineItemInputSchema).min(1).describe('Line items being credited. Catalog item IDs are not required.'),
        date: z.string().optional().describe('Credit note date in yyyy-mm-dd format. Defaults to the current date when omitted.'),
        creditnote_number: z.string().optional().describe('Credit note number. Auto-generated with a CN prefix when omitted.'),
        reference_number: z.string().optional().describe('Free-form reference number for linking the credit note to an external system.'),
        notes: z.string().optional().describe('Notes shown on the credit note.'),
        terms: z.string().optional().describe('Terms and conditions shown on the credit note.'),
        is_draft: z.boolean().optional().describe('Set to true to create the credit note in draft status so it can still be edited.')
    })
    .describe('Input for creating a Zoho Invoice credit note.');

const LineItemOutputSchema = z.object({
    line_item_id: z.string().optional().describe('Unique ID of the credit note line item.'),
    item_id: z.string().optional().describe('Catalog item ID linked to the line item, empty for free-text items.'),
    name: z.string().optional().describe('Name of the credited product or service.'),
    description: z.string().optional().describe('Description of the credited product or service.'),
    quantity: z.number().optional().describe('Number of units credited.'),
    unit: z.string().optional().describe('Unit of measure for the quantity.'),
    rate: z.number().optional().describe('Unit rate of the line item.'),
    item_total: z.number().optional().describe('Total amount of the line item.'),
    tax_name: z.string().optional().describe('Name of the tax applied to the line item.'),
    tax_percentage: z.number().optional().describe('Tax percentage applied to the line item.')
});

const OutputSchema = z
    .object({
        creditnote_id: z.string().describe('Unique ID of the created credit note.'),
        creditnote_number: z.string().optional().describe('Credit note number assigned by Zoho.'),
        status: z.string().optional().describe('Credit note status, for example "open" or "draft".'),
        date: z.string().optional().describe('Credit note date in yyyy-mm-dd format.'),
        customer_id: z.string().optional().describe('Contact ID of the customer the credit note is issued to.'),
        customer_name: z.string().optional().describe('Name of the customer the credit note is issued to.'),
        reference_number: z.string().optional().describe('Reference number stored on the credit note.'),
        notes: z.string().optional().describe('Notes stored on the credit note.'),
        terms: z.string().optional().describe('Terms and conditions stored on the credit note.'),
        total: z.number().optional().describe('Total amount of the credit note.'),
        balance: z.number().optional().describe('Unused credit balance of the credit note.'),
        currency_code: z.string().optional().describe('ISO currency code of the credit note.'),
        created_time: z.string().optional().describe('Time the credit note was created.'),
        last_modified_time: z.string().optional().describe('Time the credit note was last modified.'),
        line_items: z.array(LineItemOutputSchema).optional().describe('Line items included in the credit note.')
    })
    .describe('The created Zoho Invoice credit note.');

const ProviderLineItemSchema = z.object({
    line_item_id: z.union([z.string(), z.number()]).nullable().optional(),
    item_id: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    quantity: z.number().nullable().optional(),
    unit: z.string().nullable().optional(),
    rate: z.number().nullable().optional(),
    item_total: z.number().nullable().optional(),
    tax_name: z.string().nullable().optional(),
    tax_percentage: z.number().nullable().optional()
});

const ProviderCreditNoteSchema = z.object({
    creditnote_id: z.string(),
    creditnote_number: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    customer_id: z.string().nullable().optional(),
    customer_name: z.string().nullable().optional(),
    reference_number: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    terms: z.string().nullable().optional(),
    total: z.number().nullable().optional(),
    balance: z.number().nullable().optional(),
    currency_code: z.string().nullable().optional(),
    created_time: z.string().nullable().optional(),
    last_modified_time: z.string().nullable().optional(),
    line_items: z.array(ProviderLineItemSchema).nullable().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    creditnote: ProviderCreditNoteSchema.optional()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new credit note in Zoho Invoice, which mutates provider state.
 * @pitfalls: Omitting is_draft creates the credit note in open status rather than a draft.
 */
const action = createAction({
    description: 'Create a new credit note for a customer. Line items do not require a catalog item_id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.creditnotes.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.zoho.com/invoice/api/v3/credit-notes/#create-a-credit-note
            endpoint: '/invoice/v3/creditnotes',
            params: {
                organization_id: input.organization_id
            },
            data: {
                customer_id: input.customer_id,
                line_items: input.line_items.map((item) => ({
                    ...(item.item_id !== undefined && { item_id: item.item_id }),
                    ...(item.name !== undefined && { name: item.name }),
                    ...(item.description !== undefined && { description: item.description }),
                    ...(item.rate !== undefined && { rate: item.rate }),
                    ...(item.quantity !== undefined && { quantity: item.quantity }),
                    ...(item.unit !== undefined && { unit: item.unit }),
                    ...(item.discount !== undefined && { discount: item.discount }),
                    ...(item.tax_id !== undefined && { tax_id: item.tax_id }),
                    ...(item.account_id !== undefined && { account_id: item.account_id }),
                    ...(item.project_id !== undefined && { project_id: item.project_id })
                })),
                ...(input.date !== undefined && { date: input.date }),
                ...(input.creditnote_number !== undefined && { creditnote_number: input.creditnote_number }),
                ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.terms !== undefined && { terms: input.terms }),
                ...(input.is_draft !== undefined && { is_draft: input.is_draft })
            },
            // Creating a credit note is not idempotent: a retry after a lost response would create a duplicate.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success || !parsed.data.creditnote) {
            throw new nango.ActionError({
                type: 'credit_note_not_created',
                message: parsed.success && parsed.data.message ? parsed.data.message : 'The provider did not return a created credit note.'
            });
        }

        const creditnote = parsed.data.creditnote;

        return {
            creditnote_id: creditnote.creditnote_id,
            ...(creditnote.creditnote_number != null && { creditnote_number: creditnote.creditnote_number }),
            ...(creditnote.status != null && { status: creditnote.status }),
            ...(creditnote.date != null && { date: creditnote.date }),
            ...(creditnote.customer_id != null && { customer_id: creditnote.customer_id }),
            ...(creditnote.customer_name != null && { customer_name: creditnote.customer_name }),
            ...(creditnote.reference_number != null && { reference_number: creditnote.reference_number }),
            ...(creditnote.notes != null && { notes: creditnote.notes }),
            ...(creditnote.terms != null && { terms: creditnote.terms }),
            ...(creditnote.total != null && { total: creditnote.total }),
            ...(creditnote.balance != null && { balance: creditnote.balance }),
            ...(creditnote.currency_code != null && { currency_code: creditnote.currency_code }),
            ...(creditnote.created_time != null && { created_time: creditnote.created_time }),
            ...(creditnote.last_modified_time != null && { last_modified_time: creditnote.last_modified_time }),
            ...(creditnote.line_items != null && {
                line_items: creditnote.line_items.map((lineItem) => ({
                    ...(lineItem.line_item_id != null && { line_item_id: String(lineItem.line_item_id) }),
                    ...(lineItem.item_id != null && { item_id: lineItem.item_id }),
                    ...(lineItem.name != null && { name: lineItem.name }),
                    ...(lineItem.description != null && { description: lineItem.description }),
                    ...(lineItem.quantity != null && { quantity: lineItem.quantity }),
                    ...(lineItem.unit != null && { unit: lineItem.unit }),
                    ...(lineItem.rate != null && { rate: lineItem.rate }),
                    ...(lineItem.item_total != null && { item_total: lineItem.item_total }),
                    ...(lineItem.tax_name != null && { tax_name: lineItem.tax_name }),
                    ...(lineItem.tax_percentage != null && { tax_percentage: lineItem.tax_percentage })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
