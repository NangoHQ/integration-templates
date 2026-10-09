import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const LineItemSchema = z.object({
    item_id: z.string().optional().describe('Unique identifier for the item. Example: "260815000000100002"'),
    line_item_id: z.string().optional().describe('Unique ID of an existing line item to update. Example: "260815000000159217"'),
    account_id: z.string().optional().describe('Chart of accounts ID. Example: "260815000000000388"'),
    name: z.string().optional().describe('Name of the line item'),
    description: z.string().optional().describe('Description of the line item'),
    rate: z.number().optional().describe('Rate per unit'),
    quantity: z.number().optional().describe('Number of units'),
    unit: z.string().optional().describe('Unit of measure. Example: "kgs"'),
    discount: z.union([z.string(), z.number()]).optional().describe('Discount amount or percentage'),
    tax_id: z.string().optional().describe('Tax ID applied to the line item')
});

const InputSchema = z
    .object({
        creditnote_id: z.string().describe('ID of the credit note to update. Example: "260815000000159209"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            ),
        customer_id: z.string().optional().describe('Customer contact ID. Example: "260815000000155015"'),
        date: z.string().optional().describe('Credit note date in yyyy-mm-dd format. Example: "2026-10-09"'),
        notes: z.string().optional().describe('Notes displayed on the credit note. Max-length [5000]'),
        terms: z.string().optional().describe('Terms displayed on the credit note. Max-length [10000]'),
        reference_number: z.string().optional().describe('Reference number. Max-length [100]'),
        creditnote_number: z.string().optional().describe('Credit note number. Max-length [100]'),
        currency_id: z.string().optional().describe('Currency ID for the credit note'),
        exchange_rate: z.string().optional().describe('Exchange rate to base currency'),
        is_draft: z.boolean().optional().describe('Set to true to save as draft'),
        line_items: z.array(LineItemSchema).optional().describe('Line items for the credit note'),
        ignore_auto_number_generation: z.boolean().optional().describe('Set to true to provide a custom credit note number')
    })
    .describe('Fields to update on an existing Zoho Inventory credit note. Only the provided fields are changed.');

const ContactPersonCommunicationSchema = z.object({
    is_email_enabled: z.boolean().optional().describe('Whether email communication is enabled for the contact person'),
    is_whatsapp_enabled: z.boolean().optional().describe('Whether WhatsApp communication is enabled for the contact person')
});

const ContactPersonSchema = z.object({
    contact_person_id: z.string().optional().describe('Unique ID of the contact person'),
    contact_person_name: z.string().optional().describe('Full name of the contact person'),
    first_name: z.string().optional().describe('First name of the contact person'),
    last_name: z.string().optional().describe('Last name of the contact person'),
    contact_person_email: z.string().optional().describe('Email address of the contact person'),
    phone: z.string().optional().describe('Phone number of the contact person'),
    mobile: z.string().optional().describe('Mobile number of the contact person'),
    communication_preference: ContactPersonCommunicationSchema.optional().describe('Preferred communication modes for the contact person')
});

const BillingAddressSchema = z.object({
    address: z.string().optional().describe('Street address'),
    street2: z.string().optional().describe('Second line of the street address'),
    city: z.string().optional().describe('City'),
    state: z.string().optional().describe('State or province'),
    zip: z.union([z.string(), z.number()]).optional().describe('Postal code'),
    country: z.string().optional().describe('Country'),
    fax: z.string().optional().describe('Fax number'),
    attention: z.string().optional().describe('Attention line')
});

const ShippingAddressSchema = z.object({
    address: z.string().optional().describe('Street address'),
    street2: z.string().optional().describe('Second line of the street address'),
    city: z.string().optional().describe('City'),
    state: z.string().optional().describe('State or province'),
    zip: z.union([z.string(), z.number()]).optional().describe('Postal code'),
    country: z.string().optional().describe('Country'),
    fax: z.string().optional().describe('Fax number'),
    attention: z.string().optional().describe('Attention line')
});

const LineItemResponseSchema = z
    .object({
        item_id: z.string().optional().describe('Unique identifier for the item'),
        line_item_id: z.string().optional().describe('Unique ID of the line item'),
        account_id: z.string().optional().describe('Chart of accounts ID'),
        account_name: z.string().optional().describe('Chart of accounts name'),
        name: z.string().optional().describe('Name of the line item'),
        description: z.string().optional().describe('Description of the line item'),
        code: z.string().optional().describe('Item code'),
        type: z.number().optional().describe('Line item type'),
        quantity: z.number().optional().describe('Number of units'),
        rate: z.number().optional().describe('Rate per unit'),
        unit: z.string().optional().describe('Unit of measure'),
        discount: z.union([z.string(), z.number()]).optional().describe('Discount amount or percentage'),
        tax_id: z.string().optional().describe('Tax ID applied to the line item'),
        tax_name: z.string().optional().describe('Tax name applied to the line item'),
        tax_amount: z.string().optional().describe('Tax amount for the line item'),
        item_total: z.number().optional().describe('Total amount for the line item'),
        product_type: z.string().optional().describe('Product type of the item'),
        serial_numbers: z.string().optional().describe('Serial numbers associated with the line item'),
        location_id: z.string().optional().describe('Location ID for the line item'),
        location_name: z.string().optional().describe('Location name for the line item')
    })
    .passthrough();

const TaxSchema = z.object({
    tax_id: z.string().optional().describe('Tax ID'),
    tax_name: z.string().optional().describe('Tax name'),
    tax_amount: z.string().optional().describe('Tax amount')
});

const InvoiceCreditedSchema = z.object({
    invoice_id: z.string().optional().describe('ID of the invoice credited'),
    invoice_number: z.string().optional().describe('Number of the invoice credited'),
    amount: z.number().optional().describe('Amount credited to the invoice')
});

const CreditNoteResponseSchema = z.object({
    creditnote_id: z.string().describe('Unique ID of the credit note'),
    creditnote_number: z.string().optional().describe('Credit note number'),
    date: z.string().optional().describe('Credit note date'),
    status: z.string().optional().describe('Credit note status'),
    customer_id: z.string().optional().describe('Customer contact ID'),
    customer_name: z.string().optional().describe('Customer contact name'),
    contact_persons_associated: z.array(ContactPersonSchema).optional().describe('Contact persons associated with the credit note'),
    total: z.number().optional().describe('Total amount of the credit note'),
    balance: z.number().optional().describe('Outstanding balance of the credit note'),
    notes: z.string().optional().describe('Notes displayed on the credit note'),
    terms: z.string().optional().describe('Terms displayed on the credit note'),
    reference_number: z.string().optional().describe('Reference number'),
    currency_code: z.string().optional().describe('Currency code'),
    currency_symbol: z.string().optional().describe('Currency symbol'),
    line_items: z.array(LineItemResponseSchema).optional().describe('Line items of the credit note'),
    taxes: z.array(TaxSchema).optional().describe('Taxes applied to the credit note'),
    invoices_credited: z.array(InvoiceCreditedSchema).optional().describe('Invoices credited by this credit note'),
    billing_address: BillingAddressSchema.optional().describe('Billing address of the credit note'),
    shipping_address: ShippingAddressSchema.optional().describe('Shipping address of the credit note'),
    created_time: z.string().optional().describe('Time the credit note was created'),
    last_modified_time: z.string().optional().describe('Time the credit note was last modified'),
    template_id: z.string().optional().describe('Template ID used for the credit note'),
    template_name: z.string().optional().describe('Template name used for the credit note')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    creditnote: CreditNoteResponseSchema.optional()
});

const OutputSchema = z
    .object({
        creditnote_id: z.string().describe('Unique ID of the updated credit note'),
        creditnote_number: z.string().optional().describe('Credit note number'),
        date: z.string().optional().describe('Credit note date'),
        status: z.string().optional().describe('Credit note status. Example: "open", "draft", "closed"'),
        customer_id: z.string().optional().describe('Customer contact ID'),
        customer_name: z.string().optional().describe('Customer contact name'),
        total: z.number().optional().describe('Total amount of the credit note'),
        balance: z.number().optional().describe('Outstanding balance of the credit note'),
        notes: z.string().optional().describe('Notes displayed on the credit note'),
        terms: z.string().optional().describe('Terms displayed on the credit note'),
        reference_number: z.string().optional().describe('Reference number'),
        currency_code: z.string().optional().describe('Currency code'),
        currency_symbol: z.string().optional().describe('Currency symbol'),
        line_items: z.array(LineItemResponseSchema).optional().describe('Line items of the credit note'),
        taxes: z.array(TaxSchema).optional().describe('Taxes applied to the credit note'),
        invoices_credited: z.array(InvoiceCreditedSchema).optional().describe('Invoices credited by this credit note'),
        billing_address: BillingAddressSchema.optional().describe('Billing address of the credit note'),
        shipping_address: ShippingAddressSchema.optional().describe('Shipping address of the credit note'),
        created_time: z.string().optional().describe('Time the credit note was created'),
        last_modified_time: z.string().optional().describe('Time the credit note was last modified')
    })
    .describe('The updated Zoho Inventory credit note.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the organization list when organization_id is omitted, then updates the credit note.
 * @pitfalls: A custom creditnote_number is silently ignored unless ignore_auto_number_generation is also true, in which case the auto-generated number is kept.
 */
const action = createAction({
    description: 'Update an existing credit note in Zoho Inventory.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.creditnotes.UPDATE', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const body: {
            customer_id?: string;
            date?: string;
            notes?: string;
            terms?: string;
            reference_number?: string;
            creditnote_number?: string;
            currency_id?: string;
            exchange_rate?: string;
            is_draft?: boolean;
            line_items?: z.infer<typeof LineItemSchema>[];
            ignore_auto_number_generation?: boolean;
        } = {};

        if (input.customer_id !== undefined) {
            body.customer_id = input.customer_id;
        }
        if (input.date !== undefined) {
            body.date = input.date;
        }
        if (input.notes !== undefined) {
            body.notes = input.notes;
        }
        if (input.terms !== undefined) {
            body.terms = input.terms;
        }
        if (input.reference_number !== undefined) {
            body.reference_number = input.reference_number;
        }
        if (input.creditnote_number !== undefined) {
            body.creditnote_number = input.creditnote_number;
        }
        if (input.currency_id !== undefined) {
            body.currency_id = input.currency_id;
        }
        if (input.exchange_rate !== undefined) {
            body.exchange_rate = input.exchange_rate;
        }
        if (input.is_draft !== undefined) {
            body.is_draft = input.is_draft;
        }
        if (input.line_items !== undefined) {
            body.line_items = input.line_items;
        }
        if (input.ignore_auto_number_generation !== undefined) {
            body.ignore_auto_number_generation = input.ignore_auto_number_generation;
        }

        // https://www.zoho.com/inventory/api/v1/credit-notes/#update-a-credit-note
        const response = await nango.put({
            endpoint: `/inventory/v1/creditnotes/${encodeURIComponent(input.creditnote_id)}`,
            params: {
                organization_id: organizationId
            },
            data: body,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code
            });
        }

        if (!providerResponse.creditnote) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Zoho Inventory did not return the updated credit note.',
                creditnote_id: input.creditnote_id
            });
        }

        const cn = providerResponse.creditnote;

        return {
            creditnote_id: cn.creditnote_id,
            ...(cn.creditnote_number !== undefined && { creditnote_number: cn.creditnote_number }),
            ...(cn.date !== undefined && { date: cn.date }),
            ...(cn.status !== undefined && { status: cn.status }),
            ...(cn.customer_id !== undefined && { customer_id: cn.customer_id }),
            ...(cn.customer_name !== undefined && { customer_name: cn.customer_name }),
            ...(cn.total !== undefined && { total: cn.total }),
            ...(cn.balance !== undefined && { balance: cn.balance }),
            ...(cn.notes !== undefined && { notes: cn.notes }),
            ...(cn.terms !== undefined && { terms: cn.terms }),
            ...(cn.reference_number !== undefined && { reference_number: cn.reference_number }),
            ...(cn.currency_code !== undefined && { currency_code: cn.currency_code }),
            ...(cn.currency_symbol !== undefined && { currency_symbol: cn.currency_symbol }),
            ...(cn.line_items !== undefined && { line_items: cn.line_items }),
            ...(cn.taxes !== undefined && { taxes: cn.taxes }),
            ...(cn.invoices_credited !== undefined && { invoices_credited: cn.invoices_credited }),
            ...(cn.billing_address !== undefined && { billing_address: cn.billing_address }),
            ...(cn.shipping_address !== undefined && { shipping_address: cn.shipping_address }),
            ...(cn.created_time !== undefined && { created_time: cn.created_time }),
            ...(cn.last_modified_time !== undefined && { last_modified_time: cn.last_modified_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
