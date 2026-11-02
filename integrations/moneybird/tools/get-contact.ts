import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .strictObject({
        contactId: z
            .string()
            .regex(/^[0-9]+$/)
            .optional()
            .meta({
                description: 'Opaque Moneybird contact ID; mutually exclusive with customerId.'
            }),
        customerId: z.string().min(1).optional().meta({
            description: 'Exact administration-scoped customer number, preserving leading zeros.'
        }),
        includeArchived: z.boolean().optional().meta({
            description: 'Include archived targets for contactId lookup; unavailable with customerId.',
            default: false
        })
    })
    .refine(
        (value) => (value.contactId !== undefined ? value.customerId === undefined : value.customerId !== undefined && value.includeArchived === undefined),
        'Supply exactly one of contactId or customerId; includeArchived is only available with contactId.'
    )
    .meta({
        description: 'Lookup key selecting one contact: supply exactly one of contactId or customerId.',
        anyOf: [
            { not: { anyOf: [{ required: ['contactId'] }, { required: ['includeArchived'] }] }, required: ['customerId'] },
            { not: { required: ['customerId'] }, required: ['contactId'] }
        ]
    });

const OutputNoteSchema = z.object({
    id: z.string().optional().describe('Note ID.'),
    text: z.string().nullable().optional().describe('Ordinary note text.'),
    todo: z.boolean().nullable().optional().describe('Whether the note is a to-do.'),
    assigneeId: z.string().nullable().optional().describe('Assigned user ID.'),
    completedAt: z.iso.datetime({ offset: true }).nullable().optional().describe('Completion instant in UTC, null if incomplete.')
});

const OutputCustomFieldSchema = z.object({
    id: z.string().optional().describe('Custom-field definition ID.'),
    name: z.string().optional().describe('Custom-field label.'),
    value: z.string().optional().describe('Stored custom-field value.')
});

const OutputContactPersonSchema = z.object({
    id: z.string().nullable().optional().describe('Person ID.'),
    email: z.string().nullable().optional().describe("Person's email address."),
    phone: z.string().nullable().optional().describe("Person's phone number."),
    lastName: z.string().nullable().optional().describe('Family name.'),
    firstName: z.string().nullable().optional().describe('Given name.'),
    department: z.string().nullable().optional().describe('Department.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Opaque Moneybird contact ID.'),
        city: z.string().nullable().optional().describe('City or town.'),
        email: z.string().nullable().optional().describe('Provider contact email display value.'),
        notes: z.array(OutputNoteSchema).optional().describe('Contact notes and to-dos.'),
        phone: z.string().nullable().optional().describe('Telephone number.'),
        country: z.string().optional().describe('Country code returned by Moneybird.'),
        sepaBic: z.string().nullable().optional().describe('SEPA bank BIC.'),
        version: z.string().optional().describe('Opaque provider revision value, not a timestamp.'),
        address1: z.string().nullable().optional().describe('Primary address line.'),
        address2: z.string().nullable().optional().describe('Additional address line.'),
        archived: z.boolean().optional().describe('Archived lifecycle state.'),
        emailUbl: z.boolean().optional().describe('Whether emailed invoices include UBL XML.'),
        lastName: z.string().nullable().optional().describe('Family name.'),
        sepaIban: z.string().nullable().optional().describe('SEPA collection IBAN.'),
        createdAt: z.iso.datetime({ offset: true }).optional().describe('Creation instant in UTC Z.'),
        firstName: z.string().nullable().optional().describe('Given name.'),
        taxNumber: z.string().nullable().optional().describe('Tax or VAT number.'),
        updatedAt: z.iso.datetime({ offset: true }).optional().describe('Modification instant in UTC Z.'),
        customerId: z.string().optional().describe('Customer number unique within the administration.'),
        postalCode: z.string().nullable().optional().describe('Postal code.'),
        sepaActive: z.boolean().nullable().optional().describe('SEPA configuration activation state.'),
        bankAccount: z.string().nullable().optional().describe('Bank account used for outgoing payments.'),
        companyName: z.string().nullable().optional().describe('Business name.'),
        directDebit: z.boolean().optional().describe('Whether invoices use SEPA direct debit.'),
        customFields: z.array(OutputCustomFieldSchema).optional().describe('Assigned custom-field values.'),
        contactPeople: z.array(OutputContactPersonSchema).optional().describe('People associated with this contact.'),
        invoiceEmails: z
            .array(z.string())
            .nullable()
            .optional()
            .describe('Invoice recipient addresses; null preserves an unset source, [] represents an empty source string.'),
        sepaMandateId: z.string().nullable().optional().describe('SEPA mandate reference.'),
        deliveryMethod: z.string().nullable().optional().describe('Document delivery channel.'),
        estimateEmails: z.array(z.string()).nullable().optional().describe('Estimate recipient addresses with the same null/empty distinction.'),
        taxNumberValid: z.boolean().nullable().optional().describe('Tax-number validation result, null when unknown.'),
        sepaAccountName: z.string().nullable().optional().describe("SEPA account holder's name."),
        sepaMandateDate: z.iso.date().nullable().optional().describe('SEPA mandate calendar date.'),
        administrationId: z.string().optional().describe('Owning administration ID.'),
        invoiceAttention: z.string().nullable().optional().describe('Invoice attention line.'),
        salesInvoicesUrl: z.string().optional().describe("Contact's invoice portal URL; treat as sensitive."),
        sepaSequenceType: z.string().optional().describe('SEPA sequence code.'),
        chamberOfCommerce: z.string().nullable().optional().describe('Business registration number.'),
        estimateAttention: z.string().nullable().optional().describe('Estimate attention line.'),
        invoiceWorkflowId: z.string().nullable().optional().describe('Default invoice workflow ID.'),
        estimateWorkflowId: z.string().nullable().optional().describe('Default estimate workflow ID.'),
        eInvoicingIdentifier: z.string().nullable().optional().describe('E-invoicing identifier value.'),
        taxNumberValidatedAt: z.iso.datetime({ offset: true }).nullable().optional().describe('Tax-validation instant in UTC.'),
        eInvoicingIdentifierType: z.string().nullable().optional().describe('E-invoicing identifier scheme code.'),
        hasMoneybirdPaymentsMandate: z.boolean().optional().describe('Whether a valid Moneybird Payments mandate exists.')
    })
    .describe("A Moneybird contact's identity, address, billing configuration, people, notes, and custom-field values.");

const ProviderIdSchema = z.union([z.string(), z.number()]);

const ProviderNoteSchema = z.object({
    id: ProviderIdSchema.optional(),
    note: z.string().nullable().optional(),
    todo: z.union([z.boolean(), z.string()]).nullable().optional(),
    assignee_id: ProviderIdSchema.nullable().optional(),
    completed_at: z.string().nullable().optional()
});

const ProviderCustomFieldSchema = z.object({
    id: ProviderIdSchema.optional(),
    name: z.string().optional(),
    value: z.string().optional()
});

const ProviderContactPersonSchema = z.object({
    id: ProviderIdSchema.nullable().optional(),
    firstname: z.string().nullable().optional(),
    lastname: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    department: z.string().nullable().optional()
});

const ProviderContactSchema = z.object({
    id: ProviderIdSchema,
    administration_id: ProviderIdSchema.optional(),
    customer_id: z.string().optional(),
    company_name: z.string().nullable().optional(),
    firstname: z.string().nullable().optional(),
    lastname: z.string().nullable().optional(),
    address1: z.string().nullable().optional(),
    address2: z.string().nullable().optional(),
    zipcode: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    country: z.string().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    delivery_method: z.string().nullable().optional(),
    tax_number: z.string().nullable().optional(),
    chamber_of_commerce: z.string().nullable().optional(),
    bank_account: z.string().nullable().optional(),
    email_ubl: z.boolean().optional(),
    send_invoices_to_attention: z.string().nullable().optional(),
    send_invoices_to_email: z.string().nullable().optional(),
    send_estimates_to_attention: z.string().nullable().optional(),
    send_estimates_to_email: z.string().nullable().optional(),
    direct_debit: z.boolean().optional(),
    sepa_active: z.boolean().nullable().optional(),
    sepa_iban: z.string().nullable().optional(),
    sepa_iban_account_name: z.string().nullable().optional(),
    sepa_bic: z.string().nullable().optional(),
    sepa_mandate_id: z.string().nullable().optional(),
    sepa_mandate_date: z.string().nullable().optional(),
    sepa_sequence_type: z.string().optional(),
    tax_number_validated_at: z.string().nullable().optional(),
    tax_number_valid: z.boolean().nullable().optional(),
    invoice_workflow_id: ProviderIdSchema.nullable().optional(),
    estimate_workflow_id: ProviderIdSchema.nullable().optional(),
    si_identifier: z.string().nullable().optional(),
    si_identifier_type: z.string().nullable().optional(),
    moneybird_payments_mandate: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    version: ProviderIdSchema.optional(),
    sales_invoices_url: z.string().optional(),
    notes: z.array(ProviderNoteSchema).optional(),
    custom_fields: z.array(ProviderCustomFieldSchema).optional(),
    contact_people: z.array(ProviderContactPersonSchema).optional(),
    archived: z.boolean().optional()
});

const ConnectionMetadataSchema = z.object({
    administration_id: z.union([z.string(), z.number()])
});

const ProviderErrorShapeSchema = z.object({
    response: z.object({
        status: z.number()
    })
});

const INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function stringifyId(value: string | number): string {
    return typeof value === 'string' ? value : String(value);
}

function normalizeInstantToUtc(value: string): string {
    if (!INSTANT_PATTERN.test(value)) {
        throw new Error(`Moneybird returned a timestamp that is not an ISO 8601 date-time: ${JSON.stringify(value)}.`);
    }
    const hasZuluSuffix = value.endsWith('Z');
    const offset = hasZuluSuffix ? 'Z' : value.slice(-6);
    const localPart = hasZuluSuffix ? value.slice(0, -1) : value.slice(0, -6);
    const fractionStart = localPart.indexOf('.');
    const head = fractionStart === -1 ? localPart : localPart.slice(0, fractionStart);
    const fraction = fractionStart === -1 ? '' : localPart.slice(fractionStart);
    // Date.parse is only specification-defined for fractions of at most three digits, so the instant is validated and
    // shifted with the fraction truncated to milliseconds; the original fraction is re-attached afterwards so
    // sub-millisecond precision is preserved without rounding.
    const millis = Date.parse(`${head}${fraction.slice(0, 4)}${offset}`);
    if (Number.isNaN(millis)) {
        throw new Error(`Moneybird returned a timestamp that is not a valid calendar instant: ${JSON.stringify(value)}.`);
    }
    if (hasZuluSuffix) {
        return value;
    }
    return `${new Date(millis).toISOString().slice(0, 19)}${fraction}Z`;
}

function normalizeTodo(value: boolean | string | null): boolean | null {
    if (value === null || typeof value === 'boolean') {
        return value;
    }
    if (value === 'true' || value === '1') {
        return true;
    }
    if (value === 'false' || value === '0') {
        return false;
    }
    throw new Error(`Moneybird returned a note todo value that is not a recognized boolean form: ${JSON.stringify(value)}.`);
}

function splitEmailList(value: string | null): string[] | null {
    if (value === null) {
        return null;
    }
    if (value.trim() === '') {
        return [];
    }
    return value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}

function providerErrorStatus(error: unknown): number | undefined {
    const parsed = ProviderErrorShapeSchema.safeParse(error);
    return parsed.success ? parsed.data.response.status : undefined;
}

function toOutputNote(note: z.infer<typeof ProviderNoteSchema>): z.infer<typeof OutputNoteSchema> {
    return {
        ...(note.id !== undefined && { id: stringifyId(note.id) }),
        ...(note.note !== undefined && { text: note.note }),
        ...(note.todo !== undefined && { todo: normalizeTodo(note.todo) }),
        ...(note.assignee_id !== undefined && { assigneeId: note.assignee_id === null ? null : stringifyId(note.assignee_id) }),
        ...(note.completed_at !== undefined && { completedAt: note.completed_at === null ? null : normalizeInstantToUtc(note.completed_at) })
    };
}

function toOutputCustomField(customField: z.infer<typeof ProviderCustomFieldSchema>): z.infer<typeof OutputCustomFieldSchema> {
    return {
        ...(customField.id !== undefined && { id: stringifyId(customField.id) }),
        ...(customField.name !== undefined && { name: customField.name }),
        ...(customField.value !== undefined && { value: customField.value })
    };
}

function toOutputContactPerson(person: z.infer<typeof ProviderContactPersonSchema>): z.infer<typeof OutputContactPersonSchema> {
    return {
        ...(person.id !== undefined && { id: person.id === null ? null : stringifyId(person.id) }),
        ...(person.email !== undefined && { email: person.email }),
        ...(person.phone !== undefined && { phone: person.phone }),
        ...(person.lastname !== undefined && { lastName: person.lastname }),
        ...(person.firstname !== undefined && { firstName: person.firstname }),
        ...(person.department !== undefined && { department: person.department })
    };
}

function toOutputContact(contact: z.infer<typeof ProviderContactSchema>): z.infer<typeof OutputSchema> {
    return {
        id: stringifyId(contact.id),
        ...(contact.city !== undefined && { city: contact.city }),
        ...(contact.email !== undefined && { email: contact.email }),
        ...(contact.notes !== undefined && { notes: contact.notes.map(toOutputNote) }),
        ...(contact.phone !== undefined && { phone: contact.phone }),
        ...(contact.country !== undefined && { country: contact.country }),
        ...(contact.sepa_bic !== undefined && { sepaBic: contact.sepa_bic }),
        ...(contact.version !== undefined && { version: stringifyId(contact.version) }),
        ...(contact.address1 !== undefined && { address1: contact.address1 }),
        ...(contact.address2 !== undefined && { address2: contact.address2 }),
        ...(contact.archived !== undefined && { archived: contact.archived }),
        ...(contact.email_ubl !== undefined && { emailUbl: contact.email_ubl }),
        ...(contact.lastname !== undefined && { lastName: contact.lastname }),
        ...(contact.sepa_iban !== undefined && { sepaIban: contact.sepa_iban }),
        ...(contact.created_at !== undefined && { createdAt: normalizeInstantToUtc(contact.created_at) }),
        ...(contact.firstname !== undefined && { firstName: contact.firstname }),
        ...(contact.tax_number !== undefined && { taxNumber: contact.tax_number }),
        ...(contact.updated_at !== undefined && { updatedAt: normalizeInstantToUtc(contact.updated_at) }),
        ...(contact.customer_id !== undefined && { customerId: contact.customer_id }),
        ...(contact.zipcode !== undefined && { postalCode: contact.zipcode }),
        ...(contact.sepa_active !== undefined && { sepaActive: contact.sepa_active }),
        ...(contact.bank_account !== undefined && { bankAccount: contact.bank_account }),
        ...(contact.company_name !== undefined && { companyName: contact.company_name }),
        ...(contact.direct_debit !== undefined && { directDebit: contact.direct_debit }),
        ...(contact.custom_fields !== undefined && { customFields: contact.custom_fields.map(toOutputCustomField) }),
        ...(contact.contact_people !== undefined && { contactPeople: contact.contact_people.map(toOutputContactPerson) }),
        ...(contact.send_invoices_to_email !== undefined && { invoiceEmails: splitEmailList(contact.send_invoices_to_email) }),
        ...(contact.sepa_mandate_id !== undefined && { sepaMandateId: contact.sepa_mandate_id }),
        ...(contact.delivery_method !== undefined && { deliveryMethod: contact.delivery_method }),
        ...(contact.send_estimates_to_email !== undefined && { estimateEmails: splitEmailList(contact.send_estimates_to_email) }),
        ...(contact.tax_number_valid !== undefined && { taxNumberValid: contact.tax_number_valid }),
        ...(contact.sepa_iban_account_name !== undefined && { sepaAccountName: contact.sepa_iban_account_name }),
        ...(contact.sepa_mandate_date !== undefined && { sepaMandateDate: contact.sepa_mandate_date }),
        ...(contact.administration_id !== undefined && { administrationId: stringifyId(contact.administration_id) }),
        ...(contact.send_invoices_to_attention !== undefined && { invoiceAttention: contact.send_invoices_to_attention }),
        ...(contact.sales_invoices_url !== undefined && { salesInvoicesUrl: contact.sales_invoices_url }),
        ...(contact.sepa_sequence_type !== undefined && { sepaSequenceType: contact.sepa_sequence_type }),
        ...(contact.chamber_of_commerce !== undefined && { chamberOfCommerce: contact.chamber_of_commerce }),
        ...(contact.send_estimates_to_attention !== undefined && { estimateAttention: contact.send_estimates_to_attention }),
        ...(contact.invoice_workflow_id !== undefined && {
            invoiceWorkflowId: contact.invoice_workflow_id === null ? null : stringifyId(contact.invoice_workflow_id)
        }),
        ...(contact.estimate_workflow_id !== undefined && {
            estimateWorkflowId: contact.estimate_workflow_id === null ? null : stringifyId(contact.estimate_workflow_id)
        }),
        ...(contact.si_identifier !== undefined && { eInvoicingIdentifier: contact.si_identifier }),
        ...(contact.tax_number_validated_at !== undefined && {
            taxNumberValidatedAt: contact.tax_number_validated_at === null ? null : normalizeInstantToUtc(contact.tax_number_validated_at)
        }),
        ...(contact.si_identifier_type !== undefined && { eInvoicingIdentifierType: contact.si_identifier_type }),
        ...(contact.moneybird_payments_mandate !== undefined && { hasMoneybirdPaymentsMandate: contact.moneybird_payments_mandate })
    };
}

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET request to fetch one contact; it never creates, updates, or deletes provider data.
 * @pitfalls: An existing contact can still fail with not_found when it is not visible to the lookup; archived contacts are returned only by contactId lookup with includeArchived=true, and the customer-number lookup has no archive override.
 */
const tool = createTool({
    name: 'get-contact',
    description: "Get a contact's identity, address, billing configuration, people, notes, and custom-field values by contact ID or customer number.",
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            "Use a Moneybird contact ID from `list-contacts`, or a customer number you already know; supply exactly one. Set includeArchived when looking up an archived contact by Moneybird ID. Use `list-contact-people` or `list-contact-notes` when only those collections are needed. Customer-number lookup follows Moneybird's archive visibility.",
        requiredScopes: ['estimates'],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        const connection = await nango.getConnection();
        const metadata = ConnectionMetadataSchema.safeParse(connection.metadata ?? {});
        if (!metadata.success) {
            throw new Error('invalid_metadata: The Moneybird connection metadata must contain an administration_id selecting the administration.');
        }
        const administrationId = encodeURIComponent(stringifyId(metadata.data.administration_id));

        let endpoint: string;
        let params: Record<string, string>;
        if (input.contactId !== undefined) {
            endpoint = `/v2/${administrationId}/contacts/${encodeURIComponent(input.contactId)}.json`;
            params = input.includeArchived ? { include_archived: 'true' } : {};
        } else if (input.customerId !== undefined) {
            endpoint = `/v2/${administrationId}/contacts/customer_id/${encodeURIComponent(input.customerId)}.json`;
            params = {};
        } else {
            throw new Error('Invalid input: supply exactly one of contactId or customerId.');
        }

        let data: unknown;
        // @allowTryCatch: the provider's 404 and 401/403 responses must be re-thrown as the contract's public not_found and permission_denied error codes.
        try {
            // https://developer.moneybird.com/api/contacts#get-contact and https://developer.moneybird.com/api/contacts#get-contact-by-customer-id
            const response = await nango.get({
                endpoint,
                params,
                retries: 3
            });
            data = response.data;
        } catch (error) {
            const status = providerErrorStatus(error);
            if (status === 404) {
                throw new Error(
                    'not_found: No contact matches the supplied identifier, or it is archived and excluded from this lookup. Use list-contacts with includeArchived, or retry by contactId with includeArchived=true.'
                );
            }
            if (status === 401 || status === 403) {
                throw new Error(
                    'permission_denied: Contact access is denied. Ask the administrator for access and one of the required scopes (estimates, sales_invoices, documents, bank or settings).'
                );
            }
            throw error;
        }

        return toOutputContact(ProviderContactSchema.parse(data));
    }
});

export default tool;
