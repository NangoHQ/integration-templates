import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const LineItemSchema = z.object({
    item_id: z.string().optional().describe('Unique identifier for the item. Example: "260815000000100002"'),
    line_item_id: z.string().optional().describe('Unique ID of an existing line item to update. Example: "260815000000111002"'),
    account_id: z.string().optional().describe('Chart of accounts ID. Example: "260815000000000388"'),
    name: z.string().optional().describe('Name of the line item'),
    description: z.string().optional().describe('Description of the line item'),
    rate: z.number().optional().describe('Rate per unit'),
    quantity: z.number().optional().describe('Number of units'),
    unit: z.string().optional().describe('Unit of measure. Example: "kgs"'),
    discount: z.union([z.string(), z.number()]).optional().describe('Discount amount or percentage'),
    tax_id: z.string().optional().describe('Tax ID applied to the line item')
});

const InputSchema = z.object({
    creditnote_id: z.string().describe('ID of the credit note to update. Example: "260815000000111002"'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        ),
    customer_id: z.string().optional().describe('Customer contact ID. Example: "260815000000097001"'),
    date: z.string().optional().describe('Credit note date in yyyy-mm-dd format. Example: "2024-01-15"'),
    notes: z.string().optional().describe('Notes displayed on the credit note. Max-length [5000]'),
    terms: z.string().optional().describe('Terms displayed on the credit note. Max-length [10000]'),
    reference_number: z.string().optional().describe('Reference number. Max-length [100]'),
    creditnote_number: z.string().optional().describe('Credit note number. Max-length [100]'),
    currency_id: z.string().optional().describe('Currency ID for the credit note'),
    exchange_rate: z.string().optional().describe('Exchange rate to base currency'),
    is_draft: z.boolean().optional().describe('Set to true to save as draft'),
    line_items: z.array(LineItemSchema).optional().describe('Line items for the credit note'),
    ignore_auto_number_generation: z.boolean().optional().describe('Set to true to provide a custom credit note number')
});

const ContactPersonCommunicationSchema = z.object({
    is_email_enabled: z.boolean().optional(),
    is_whatsapp_enabled: z.boolean().optional()
});

const ContactPersonSchema = z.object({
    contact_person_id: z.string().optional(),
    contact_person_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    contact_person_email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    communication_preference: ContactPersonCommunicationSchema.optional()
});

const BillingAddressSchema = z.object({
    address: z.string().optional(),
    street2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.union([z.string(), z.number()]).optional(),
    country: z.string().optional(),
    fax: z.string().optional(),
    attention: z.string().optional()
});

const ShippingAddressSchema = z.object({
    address: z.string().optional(),
    street2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.union([z.string(), z.number()]).optional(),
    country: z.string().optional(),
    fax: z.string().optional(),
    attention: z.string().optional()
});

const LineItemResponseSchema = z
    .object({
        item_id: z.string().optional(),
        line_item_id: z.string().optional(),
        account_id: z.string().optional(),
        account_name: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        code: z.string().optional(),
        type: z.number().optional(),
        quantity: z.number().optional(),
        rate: z.number().optional(),
        unit: z.string().optional(),
        discount: z.union([z.string(), z.number()]).optional(),
        tax_id: z.string().optional(),
        tax_name: z.string().optional(),
        tax_amount: z.string().optional(),
        item_total: z.number().optional(),
        product_type: z.string().optional(),
        serial_numbers: z.string().optional(),
        location_id: z.string().optional(),
        location_name: z.string().optional(),
        project_id: z.string().optional()
    })
    .passthrough();

const TaxSchema = z.object({
    tax_id: z.string().optional(),
    tax_name: z.string().optional(),
    tax_amount: z.string().optional()
});

const InvoiceCreditedSchema = z.object({
    invoice_id: z.string().optional(),
    invoice_number: z.string().optional(),
    amount: z.number().optional()
});

const CreditNoteResponseSchema = z.object({
    creditnote_id: z.string(),
    creditnote_number: z.string().optional(),
    date: z.string().optional(),
    status: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    contact_persons_associated: z.array(ContactPersonSchema).optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    notes: z.string().optional(),
    terms: z.string().optional(),
    reference_number: z.string().optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    line_items: z.array(LineItemResponseSchema).optional(),
    taxes: z.array(TaxSchema).optional(),
    invoices: z.array(InvoiceCreditedSchema).optional(),
    billing_address: BillingAddressSchema.optional(),
    shipping_address: ShippingAddressSchema.optional(),
    created_time: z.string().optional(),
    updated_time: z.string().optional(),
    template_id: z.string().optional(),
    template_name: z.string().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    creditnote: CreditNoteResponseSchema.optional()
});

const OutputSchema = z.object({
    creditnote_id: z.string(),
    creditnote_number: z.string().optional(),
    date: z.string().optional(),
    status: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    notes: z.string().optional(),
    terms: z.string().optional(),
    reference_number: z.string().optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    line_items: z.array(LineItemResponseSchema).optional(),
    taxes: z.array(TaxSchema).optional(),
    invoices: z.array(InvoiceCreditedSchema).optional(),
    billing_address: BillingAddressSchema.optional(),
    shipping_address: ShippingAddressSchema.optional(),
    created_time: z.string().optional(),
    updated_time: z.string().optional()
});

const action = createAction({
    description: 'Update a credit note in Zoho Books.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.creditnotes.UPDATE', 'ZohoBooks.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Failed to retrieve organizations from Zoho Books.'
                });
            }
            if (!orgData.organizations || orgData.organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            if (orgData.organizations.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_organizations',
                    message: `Multiple organizations found (${orgData.organizations.map((o) => o.organization_id).join(', ')}). Provide organization_id in the action input.`
                });
            }
            const singleOrg = orgData.organizations[0];
            if (!singleOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = singleOrg.organization_id;
        }

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

        // https://www.zoho.com/books/api/v3/credit-notes/#update-a-credit-note
        const response = await nango.put({
            endpoint: `/books/v3/creditnotes/${encodeURIComponent(input.creditnote_id)}`,
            params: {
                organization_id: organizationId
            },
            data: body,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0 || !providerResponse.creditnote) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: providerResponse.message || 'Failed to update credit note',
                code: providerResponse.code
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
            ...(cn.invoices !== undefined && { invoices: cn.invoices }),
            ...(cn.billing_address !== undefined && { billing_address: cn.billing_address }),
            ...(cn.shipping_address !== undefined && { shipping_address: cn.shipping_address }),
            ...(cn.created_time !== undefined && { created_time: cn.created_time }),
            ...(cn.updated_time !== undefined && { updated_time: cn.updated_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
