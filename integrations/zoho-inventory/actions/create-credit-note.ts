import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const LineItemInputSchema = z.object({
    item_id: z.string().describe('Unique ID of the sales item being credited. Example: "260815000000101002".'),
    quantity: z.number().describe('Quantity of the item being credited. Example: 1.'),
    rate: z.number().describe('Unit rate applied to the credited item. Example: 150.'),
    name: z.string().optional().describe('Display name for the line item. Defaults to the item name when omitted.'),
    description: z.string().optional().describe('Free-text description shown for the line item.'),
    tax_id: z.string().optional().describe('Unique ID of the tax to apply to the line item.')
});

const InputSchema = z
    .object({
        customer_id: z.string().describe('Unique ID of the customer for whom the credit note is raised. Example: "260815000000097001".'),
        line_items: z.array(LineItemInputSchema).min(1).describe('One or more items being credited. At least one line item is required.'),
        creditnote_number: z.string().optional().describe('Custom credit note number (max 100 characters). Omit to let Zoho auto-generate the next CN number.'),
        date: z.string().optional().describe('Date the credit note is raised, in yyyy-mm-dd format. Defaults to the current date when omitted.'),
        reference_number: z.string().optional().describe('External reference number stored on the credit note.'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Input for creating a Zoho Inventory credit note for a customer.');

const ProviderLineItemSchema = z.object({
    item_id: z.string(),
    name: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    quantity: z.number().optional().nullable(),
    rate: z.number().optional().nullable(),
    item_total: z.number().optional().nullable()
});

const ProviderCreditNoteSchema = z.object({
    creditnote_id: z.string(),
    creditnote_number: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    reference_number: z.string().optional().nullable(),
    customer_id: z.string().optional().nullable(),
    customer_name: z.string().optional().nullable(),
    total: z.number().optional().nullable(),
    balance: z.number().optional().nullable(),
    currency_code: z.string().optional().nullable(),
    created_time: z.string().optional().nullable(),
    last_modified_time: z.string().optional().nullable(),
    line_items: z.array(ProviderLineItemSchema).optional().nullable()
});

const CreateCreditNoteResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    creditnote: ProviderCreditNoteSchema.optional()
});

const LineItemOutputSchema = z.object({
    item_id: z.string().describe('Unique ID of the credited item.'),
    name: z.string().optional().describe('Name of the credited item.'),
    description: z.string().optional().describe('Description of the credited item.'),
    quantity: z.number().optional().describe('Credited quantity.'),
    rate: z.number().optional().describe('Unit rate applied to the credited item.'),
    item_total: z.number().optional().describe('Line total for the credited item.')
});

const OutputSchema = z
    .object({
        creditnote_id: z.string().describe('Unique ID of the created credit note.'),
        creditnote_number: z.string().optional().describe('Credit note number assigned by Zoho, e.g. "CN-00028".'),
        status: z.string().optional().describe('Credit note status, e.g. "open" or "draft".'),
        date: z.string().optional().describe('Date the credit note was raised (yyyy-mm-dd).'),
        reference_number: z.string().optional().describe('External reference number stored on the credit note.'),
        customer_id: z.string().optional().describe('Unique ID of the customer the credit note belongs to.'),
        customer_name: z.string().optional().describe('Name of the customer the credit note belongs to.'),
        total: z.number().optional().describe('Total value of the credit note.'),
        balance: z.number().optional().describe('Unapplied balance remaining on the credit note.'),
        currency_code: z.string().optional().describe('Currency code of the credit note, e.g. "USD".'),
        created_time: z.string().optional().describe('Timestamp when the credit note was created.'),
        last_modified_time: z.string().optional().describe('Timestamp when the credit note was last modified.'),
        line_items: z.array(LineItemOutputSchema).optional().describe('Line items on the created credit note.')
    })
    .describe('The created Zoho Inventory credit note.');

/**
 * @tags: [write]
 * @tagReason: Creates a new credit note in Zoho Inventory, a provider-side mutation.
 * @pitfalls: Once a credit note is applied to an invoice it can no longer be deleted or voided and the invoice it was applied to also becomes undeletable, so only apply credits when the effect is intended.
 */
const action = createAction({
    description: 'Create a new credit note for a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.creditnotes.CREATE', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const response = await nango.post<unknown>({
            // https://www.zoho.com/inventory/api/v1/credit-notes/#create-a-credit-note
            endpoint: '/inventory/v1/creditnotes',
            params: {
                organization_id: organizationId
            },
            data: {
                customer_id: input.customer_id,
                line_items: input.line_items.map((lineItem) => ({
                    item_id: lineItem.item_id,
                    quantity: lineItem.quantity,
                    rate: lineItem.rate,
                    ...(lineItem.name !== undefined && { name: lineItem.name }),
                    ...(lineItem.description !== undefined && { description: lineItem.description }),
                    ...(lineItem.tax_id !== undefined && { tax_id: lineItem.tax_id })
                })),
                ...(input.creditnote_number !== undefined && { creditnote_number: input.creditnote_number }),
                ...(input.date !== undefined && { date: input.date }),
                ...(input.reference_number !== undefined && { reference_number: input.reference_number })
            },
            // Credit note creation is not idempotent: a retried request could create a duplicate credit note.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = CreateCreditNoteResponseSchema.parse(response.data);
        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.message,
                code: parsed.code
            });
        }

        const creditNote = parsed.creditnote;
        if (!creditNote) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Zoho Inventory did not return the created credit note.'
            });
        }

        return {
            creditnote_id: creditNote.creditnote_id,
            ...(creditNote.creditnote_number != null && { creditnote_number: creditNote.creditnote_number }),
            ...(creditNote.status != null && { status: creditNote.status }),
            ...(creditNote.date != null && { date: creditNote.date }),
            ...(creditNote.reference_number != null && { reference_number: creditNote.reference_number }),
            ...(creditNote.customer_id != null && { customer_id: creditNote.customer_id }),
            ...(creditNote.customer_name != null && { customer_name: creditNote.customer_name }),
            ...(creditNote.total != null && { total: creditNote.total }),
            ...(creditNote.balance != null && { balance: creditNote.balance }),
            ...(creditNote.currency_code != null && { currency_code: creditNote.currency_code }),
            ...(creditNote.created_time != null && { created_time: creditNote.created_time }),
            ...(creditNote.last_modified_time != null && { last_modified_time: creditNote.last_modified_time }),
            ...(creditNote.line_items != null && {
                line_items: creditNote.line_items.map((lineItem) => ({
                    item_id: lineItem.item_id,
                    ...(lineItem.name != null && { name: lineItem.name }),
                    ...(lineItem.description != null && { description: lineItem.description }),
                    ...(lineItem.quantity != null && { quantity: lineItem.quantity }),
                    ...(lineItem.rate != null && { rate: lineItem.rate }),
                    ...(lineItem.item_total != null && { item_total: lineItem.item_total })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
