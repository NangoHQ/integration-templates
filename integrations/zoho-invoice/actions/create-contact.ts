import { z } from 'zod';
import { createAction } from 'nango';

const ContactPersonInputSchema = z
    .object({
        salutation: z.string().optional().describe('Salutation for the contact person. Example: "Mr." or "Ms."'),
        first_name: z.string().optional().describe('First name of the contact person. Example: "Jane"'),
        last_name: z.string().optional().describe('Last name of the contact person. Example: "Doe"'),
        email: z.string().optional().describe('Email address used as the contact person\'s email. Example: "jane.doe@example.com"'),
        phone: z.string().optional().describe('Phone number of the contact person. Example: "+1-555-0100"'),
        mobile: z.string().optional().describe('Mobile number of the contact person. Example: "+1-555-0199"'),
        designation: z.string().optional().describe('Job title of the contact person. Example: "Accounts Payable"'),
        department: z.string().optional().describe('Department the contact person belongs to. Example: "Finance"'),
        is_primary_contact: z
            .boolean()
            .optional()
            .describe("Whether this person is the primary contact. Set true to make this person's email the contact's email.")
    })
    .describe('A person associated with the contact.');

const AddressInputSchema = z
    .object({
        attention: z.string().optional().describe('Attention line for the address. Example: "Accounts Payable"'),
        address: z.string().optional().describe('First line of the street address. Example: "123 Main St"'),
        street2: z.string().optional().describe('Second line of the street address. Example: "Suite 400"'),
        city: z.string().optional().describe('City of the address. Example: "San Francisco"'),
        state: z.string().optional().describe('State or province of the address. Example: "CA"'),
        zip: z.string().optional().describe('Postal or ZIP code of the address. Example: "94105"'),
        country: z.string().optional().describe('Country of the address. Example: "USA"'),
        phone: z.string().optional().describe('Phone number associated with the address. Example: "+1-555-0100"'),
        fax: z.string().optional().describe('Fax number associated with the address. Example: "+1-555-0177"')
    })
    .describe('A mailing address for the contact.');

const InputSchema = z
    .object({
        organization_id: z.string().describe('Zoho Invoice organization ID that owns the contact. Example: "927270289"'),
        contact_name: z
            .string()
            .describe('Display name of the contact, either a person or a company. Required and must be unique within the organization. Example: "Acme Corp"'),
        contact_type: z
            .enum(['customer', 'vendor'])
            .optional()
            .describe('Whether the contact is a "customer" or a "vendor". Defaults to "customer" when omitted.'),
        company_name: z.string().optional().describe('Name of the contact\'s company. Example: "Acme Corporation"'),
        contact_persons: z
            .array(ContactPersonInputSchema)
            .optional()
            .describe("People associated with the contact. To set the contact's email, include a person with is_primary_contact set to true."),
        billing_address: AddressInputSchema.optional().describe('Billing address of the contact.'),
        shipping_address: AddressInputSchema.optional().describe('Shipping address of the contact.')
    })
    .describe('Input for creating a customer or vendor contact in a Zoho Invoice organization.');

const ProviderContactPersonSchema = z.object({
    contact_person_id: z.string().nullish(),
    salutation: z.string().nullish(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    email: z.string().nullish(),
    phone: z.string().nullish(),
    mobile: z.string().nullish(),
    designation: z.string().nullish(),
    department: z.string().nullish(),
    is_primary_contact: z.boolean().nullish()
});

const ProviderAddressSchema = z.object({
    attention: z.string().nullish(),
    address: z.string().nullish(),
    street2: z.string().nullish(),
    city: z.string().nullish(),
    state: z.string().nullish(),
    zip: z.string().nullish(),
    country: z.string().nullish(),
    phone: z.string().nullish(),
    fax: z.string().nullish()
});

const ProviderContactSchema = z.object({
    contact_id: z.string(),
    contact_name: z.string(),
    company_name: z.string().nullish(),
    contact_type: z.string().nullish(),
    status: z.string().nullish(),
    email: z.string().nullish(),
    phone: z.string().nullish(),
    contact_persons: z.array(ProviderContactPersonSchema).nullish(),
    billing_address: ProviderAddressSchema.nullish(),
    shipping_address: ProviderAddressSchema.nullish(),
    created_time: z.string().nullish(),
    last_modified_time: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    contact: ProviderContactSchema
});

const ContactPersonOutputSchema = z.object({
    contact_person_id: z.string().optional().describe('Unique ID of the contact person. Example: "260815000000164002"'),
    salutation: z.string().optional().describe('Salutation of the contact person.'),
    first_name: z.string().optional().describe('First name of the contact person.'),
    last_name: z.string().optional().describe('Last name of the contact person.'),
    email: z.string().optional().describe('Email address of the contact person.'),
    phone: z.string().optional().describe('Phone number of the contact person.'),
    mobile: z.string().optional().describe('Mobile number of the contact person.'),
    designation: z.string().optional().describe('Job title of the contact person.'),
    department: z.string().optional().describe('Department of the contact person.'),
    is_primary_contact: z.boolean().optional().describe("Whether this person is the contact's primary contact.")
});

const AddressOutputSchema = z.object({
    attention: z.string().optional().describe('Attention line for the address.'),
    address: z.string().optional().describe('First line of the street address.'),
    street2: z.string().optional().describe('Second line of the street address.'),
    city: z.string().optional().describe('City of the address.'),
    state: z.string().optional().describe('State or province of the address.'),
    zip: z.string().optional().describe('Postal or ZIP code of the address.'),
    country: z.string().optional().describe('Country of the address.'),
    phone: z.string().optional().describe('Phone number associated with the address.'),
    fax: z.string().optional().describe('Fax number associated with the address.')
});

const OutputSchema = z
    .object({
        message: z.string().optional().describe('Provider confirmation message. Example: "The contact has been added."'),
        contact_id: z.string().describe('Unique ID of the newly created contact. Example: "260815000000164001"'),
        contact_name: z.string().describe('Display name of the created contact.'),
        company_name: z.string().optional().describe('Company name of the created contact.'),
        contact_type: z.string().optional().describe('Type of the created contact, either "customer" or "vendor".'),
        status: z.string().optional().describe('Status of the created contact. Example: "active"'),
        email: z.string().optional().describe('Email of the created contact, derived from its primary contact person.'),
        phone: z.string().optional().describe('Phone number of the created contact.'),
        contact_persons: z.array(ContactPersonOutputSchema).optional().describe('People associated with the created contact.'),
        billing_address: AddressOutputSchema.optional().describe('Billing address of the created contact.'),
        shipping_address: AddressOutputSchema.optional().describe('Shipping address of the created contact.'),
        created_time: z.string().optional().describe('Timestamp when the contact was created. Example: "2026-10-09T13:35:03-0400"'),
        last_modified_time: z.string().optional().describe('Timestamp when the contact was last modified. Example: "2026-10-09T13:35:03-0400"')
    })
    .describe('The newly created contact, including its ID and core profile fields.');

function mapAddress(address: z.infer<typeof ProviderAddressSchema> | null | undefined): z.infer<typeof AddressOutputSchema> | undefined {
    if (address == null) {
        return undefined;
    }
    return {
        ...(address.attention != null && { attention: address.attention }),
        ...(address.address != null && { address: address.address }),
        ...(address.street2 != null && { street2: address.street2 }),
        ...(address.city != null && { city: address.city }),
        ...(address.state != null && { state: address.state }),
        ...(address.zip != null && { zip: address.zip }),
        ...(address.country != null && { country: address.country }),
        ...(address.phone != null && { phone: address.phone }),
        ...(address.fax != null && { fax: address.fax })
    };
}

/**
 * @tags: [write]
 * @tagReason: Creates a new contact record in the provider's Zoho Invoice organization.
 * @pitfalls: A contact's email is only saved through a contact_persons entry marked is_primary_contact: true - a top-level email is silently ignored. contact_type defaults to "customer" when omitted, and creating a contact whose contact_name already exists in the organization fails.
 */
const action = createAction({
    description: 'Create a new customer or vendor contact. To set an email, pass a contact_persons array - a flat email field is silently ignored.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.contacts.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/invoice/api/v3/contacts/#create-a-contact
        const response = await nango.post({
            endpoint: '/invoice/v3/contacts',
            params: {
                organization_id: input.organization_id
            },
            data: {
                contact_name: input.contact_name,
                ...(input.contact_type !== undefined && { contact_type: input.contact_type }),
                ...(input.company_name !== undefined && { company_name: input.company_name }),
                ...(input.contact_persons !== undefined && { contact_persons: input.contact_persons }),
                ...(input.billing_address !== undefined && { billing_address: input.billing_address }),
                ...(input.shipping_address !== undefined && { shipping_address: input.shipping_address })
            },
            // The create endpoint has no idempotency key and is not naturally idempotent, so a retry after a lost response could create a duplicate contact.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const contact = parsed.contact;

        const contactPersons = contact.contact_persons?.map((person) => ({
            ...(person.contact_person_id != null && { contact_person_id: person.contact_person_id }),
            ...(person.salutation != null && { salutation: person.salutation }),
            ...(person.first_name != null && { first_name: person.first_name }),
            ...(person.last_name != null && { last_name: person.last_name }),
            ...(person.email != null && { email: person.email }),
            ...(person.phone != null && { phone: person.phone }),
            ...(person.mobile != null && { mobile: person.mobile }),
            ...(person.designation != null && { designation: person.designation }),
            ...(person.department != null && { department: person.department }),
            ...(person.is_primary_contact != null && { is_primary_contact: person.is_primary_contact })
        }));

        const billingAddress = mapAddress(contact.billing_address);
        const shippingAddress = mapAddress(contact.shipping_address);

        return {
            ...(parsed.message !== undefined && { message: parsed.message }),
            contact_id: contact.contact_id,
            contact_name: contact.contact_name,
            ...(contact.company_name != null && { company_name: contact.company_name }),
            ...(contact.contact_type != null && { contact_type: contact.contact_type }),
            ...(contact.status != null && { status: contact.status }),
            ...(contact.email != null && { email: contact.email }),
            ...(contact.phone != null && { phone: contact.phone }),
            ...(contactPersons !== undefined && { contact_persons: contactPersons }),
            ...(billingAddress !== undefined && { billing_address: billingAddress }),
            ...(shippingAddress !== undefined && { shipping_address: shippingAddress }),
            ...(contact.created_time != null && { created_time: contact.created_time }),
            ...(contact.last_modified_time != null && { last_modified_time: contact.last_modified_time })
        };
    }
});

export default action;
