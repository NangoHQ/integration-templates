import { z } from 'zod';
import { createAction } from 'nango';

const ContactPersonInputSchema = z
    .object({
        salutation: z.string().optional().describe('Salutation of the contact person. Example: "Mr".'),
        first_name: z.string().optional().describe('First name of the contact person.'),
        last_name: z.string().optional().describe('Last name of the contact person.'),
        email: z.string().optional().describe("Email of the contact person. This is what sets the contact's displayed email."),
        phone: z.string().optional().describe('Phone number of the contact person.'),
        mobile: z.string().optional().describe('Mobile number of the contact person.'),
        is_primary_contact: z.boolean().optional().describe('Set to true to mark this the primary contact person.')
    })
    .describe('A contact person attached to a newly created contact.');

const LineItemInputSchema = z
    .object({
        name: z.string().optional().describe('Name of the line item. Example: "Consulting hours".'),
        description: z.string().optional().describe('Description of the line item.'),
        rate: z.number().optional().describe('Unit rate of the line item.'),
        quantity: z.number().optional().describe('Quantity of the line item.'),
        unit: z.string().optional().describe('Unit label, for example "hours" or "kg".')
    })
    .describe('A single invoice line item.');

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .describe('Zoho Invoice organization ID. Required by every endpoint; this connection cannot look it up because it lacks the settings scope.'),
        contact_name: z
            .string()
            .describe('Exact name of the customer to invoice. An existing contact with this exact name is reused; otherwise a new contact is created.'),
        contact_persons: z
            .array(ContactPersonInputSchema)
            .optional()
            .describe('Contact persons to attach when a new contact is created. A top-level contact email is ignored by Zoho, so supply emails here.'),
        line_items: z
            .array(LineItemInputSchema)
            .describe('Invoice line items. item_id is not required; free-text items with name/rate/quantity are supported.'),
        date: z.string().describe('Invoice date in yyyy-mm-dd format. Example: "2026-10-09".'),
        due_date: z.string().optional().describe('Invoice due date in yyyy-mm-dd format. Example: "2026-10-23".'),
        reference_number: z.string().optional().describe('Reference number to store on the invoice.'),
        notes: z.string().optional().describe('Notes to display on the invoice.')
    })
    .describe('Customer name plus the invoice details used to create the invoice, creating the contact first when needed.');

const ProviderIdSchema = z.union([z.string(), z.number()]).transform((value) => String(value));

const ProviderContactSchema = z.object({
    contact_id: ProviderIdSchema,
    contact_name: z.string()
});

const ProviderContactsListSchema = z.object({
    code: z.number(),
    contacts: z.array(ProviderContactSchema).optional()
});

const ProviderContactResponseSchema = z.object({
    code: z.number(),
    contact: ProviderContactSchema
});

const ProviderInvoiceSchema = z.object({
    invoice_id: ProviderIdSchema,
    invoice_number: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    total: z.union([z.number(), z.string()]).nullable().optional(),
    balance: z.union([z.number(), z.string()]).nullable().optional(),
    date: z.string().nullable().optional(),
    due_date: z.string().nullable().optional()
});

const ProviderInvoiceResponseSchema = z.object({
    code: z.number(),
    invoice: ProviderInvoiceSchema
});

const OutputSchema = z
    .object({
        contact_created: z.boolean().describe('True if a new contact was created, false if an existing exact-name contact was reused.'),
        contact_id: z.string().describe('Zoho contact ID of the customer the invoice was created for.'),
        contact_name: z.string().describe('Name of the customer the invoice was created for.'),
        invoice_id: z.string().describe('Zoho invoice ID of the created invoice.'),
        invoice_number: z.string().optional().describe('Provider-assigned invoice number.'),
        status: z.string().optional().describe('Invoice status, for example "draft", "sent", or "unpaid".'),
        total: z.number().optional().describe('Total amount of the invoice.'),
        balance: z.number().optional().describe('Outstanding balance of the invoice.'),
        date: z.string().optional().describe('Invoice date.'),
        due_date: z.string().optional().describe('Invoice due date.')
    })
    .describe('The created invoice together with the customer it was billed to and whether that customer was newly created.');

/**
 * @tags: [read, write]
 * @tagReason: Reads contacts to look up the customer by name, then writes a contact (when missing) and an invoice.
 * @pitfalls: If invoice creation fails after a new contact was created, the contact is left behind because the action has no rollback; invoice creation may also be rejected by the organization's plan limit even though the contact lookup succeeds. Only exact name matches are reused, so a near-duplicate name creates an additional contact.
 */
const action = createAction({
    description:
        'Create an invoice for a customer identified by name, automatically creating the contact first if one does not already exist by that exact name.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.contacts.ALL', 'ZohoInvoice.invoices.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/invoice/api/v3/contacts/#list-contacts
        const listResponse = await nango.get({
            endpoint: '/contacts',
            params: {
                organization_id: input.organization_id,
                contact_name: input.contact_name
            },
            baseUrlOverride: 'https://www.zohoapis.com/invoice/v3',
            retries: 3
        });

        const contactList = ProviderContactsListSchema.parse(listResponse.data);
        const existingContact = (contactList.contacts ?? []).find((contact) => contact.contact_name === input.contact_name);

        let contactId: string;
        let contactCreated = false;

        if (existingContact) {
            contactId = existingContact.contact_id;
        } else {
            // https://www.zoho.com/invoice/api/v3/contacts/#create-a-contact
            const createContactResponse = await nango.post({
                endpoint: '/contacts',
                params: {
                    organization_id: input.organization_id
                },
                data: {
                    contact_name: input.contact_name,
                    ...(input.contact_persons !== undefined && { contact_persons: input.contact_persons })
                },
                baseUrlOverride: 'https://www.zohoapis.com/invoice/v3',
                // Creating a contact is not idempotent: a retry after a lost response would create a duplicate.
                // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                retries: 0
            });

            const createdContact = ProviderContactResponseSchema.parse(createContactResponse.data);
            contactId = createdContact.contact.contact_id;
            contactCreated = true;
        }

        // https://www.zoho.com/invoice/api/v3/invoices/#create-an-invoice
        const createInvoiceResponse = await nango.post({
            endpoint: '/invoices',
            params: {
                organization_id: input.organization_id
            },
            data: {
                customer_id: contactId,
                date: input.date,
                line_items: input.line_items,
                ...(input.due_date !== undefined && { due_date: input.due_date }),
                ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
                ...(input.notes !== undefined && { notes: input.notes })
            },
            baseUrlOverride: 'https://www.zohoapis.com/invoice/v3',
            // Creating an invoice is not idempotent: a retry after a lost response would create a duplicate invoice.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const invoice = ProviderInvoiceResponseSchema.parse(createInvoiceResponse.data).invoice;

        return {
            contact_created: contactCreated,
            contact_id: contactId,
            contact_name: input.contact_name,
            invoice_id: invoice.invoice_id,
            ...(invoice.invoice_number != null && { invoice_number: invoice.invoice_number }),
            ...(invoice.status != null && { status: invoice.status }),
            ...(invoice.total != null && { total: Number(invoice.total) }),
            ...(invoice.balance != null && { balance: Number(invoice.balance) }),
            ...(invoice.date != null && { date: invoice.date }),
            ...(invoice.due_date != null && { due_date: invoice.due_date })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
