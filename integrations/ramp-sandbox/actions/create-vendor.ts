import { z } from 'zod';
import { createAction } from 'nango';

const VendorContactInputSchema = z.object({
    email: z.string().describe('Email address of the primary vendor contact. Example: "vendor@example.com"'),
    first_name: z.string().optional().describe('First name of the primary vendor contact. Example: "John"'),
    last_name: z.string().optional().describe('Last name of the primary vendor contact. Example: "Doe"'),
    phone: z.string().optional().describe('Phone number of the primary vendor contact. Example: "+13525342357"')
});

const VendorAddressInputSchema = z.object({
    address_line_1: z.string().describe('Primary address line. Example: "442 Good St"'),
    address_line_2: z.string().optional().describe('Secondary address line or suite number. Example: "Suite 200"'),
    city: z.string().describe('City of the address. Example: "San Diego"'),
    country: z.string().describe('Two-letter country code of the address. Example: "US"'),
    postal_code: z.string().describe('Postal or ZIP code of the address. Example: "94105"'),
    state: z.string().optional().describe('Two-letter state or province abbreviation. Required for addresses in the US, CA, and AU.')
});

const InputSchema = z
    .object({
        name: z.string().min(1).describe('Name of the vendor to create. Example: "Acme Supplies"'),
        country: z.string().describe('Two-letter country code of the vendor. Example: "US"'),
        state: z.string().optional().describe('Two-letter US state abbreviation such as "NY". Required when country is "US"; ignored for other countries.'),
        business_vendor_contacts: VendorContactInputSchema.describe('Primary contact for the vendor.'),
        net_payment_terms: z.number().int().min(0).optional().describe('Number of days after receipt that payment is due; 0 means due on receipt.'),
        external_vendor_id: z.string().optional().describe('Customer-defined external identifier for the vendor. Example: "EXT-12345"'),
        default_entity_id: z.string().optional().describe('ID of the default business entity to associate with the vendor.'),
        vendor_owner_id: z.string().optional().describe('ID of the Ramp user who will own the vendor.'),
        request_payment_details: z
            .boolean()
            .optional()
            .describe('Whether to request payment details (ACH, wire, check) from the vendor. Requires a contact email.'),
        request_tax_details: z.boolean().optional().describe('Whether to request tax information from the vendor. Requires a contact email.'),
        address: VendorAddressInputSchema.optional().describe('Mailing address of the vendor.')
    })
    .describe('Input for creating a new vendor.');

const ProviderVendorAddressSchema = z.object({
    address_line_1: z.string(),
    address_line_2: z.string().nullable().optional(),
    city: z.string(),
    country: z.string(),
    postal_code: z.string(),
    state: z.string().nullable().optional()
});

const ProviderVendorSchema = z.object({
    id: z.string(),
    name: z.string(),
    country: z.string(),
    state: z.string().nullable().optional(),
    is_active: z.boolean(),
    is_deletable: z.boolean(),
    external_vendor_id: z.string().nullable().optional(),
    net_payment_terms: z.number().nullable().optional(),
    default_entity_id: z.string().nullable().optional(),
    parent_vendor_id: z.string().nullable().optional(),
    vendor_owner_id: z.string().nullable().optional(),
    contacts: z.array(z.string()).optional(),
    address: ProviderVendorAddressSchema.nullable().optional(),
    created_at: z.string(),
    updated_at: z.string().nullable().optional()
});

const VendorAddressOutputSchema = z.object({
    address_line_1: z.string().describe('Primary address line.'),
    address_line_2: z.string().optional().describe('Secondary address line or suite number.'),
    city: z.string().describe('City of the address.'),
    country: z.string().describe('Two-letter country code of the address.'),
    postal_code: z.string().describe('Postal or ZIP code of the address.'),
    state: z.string().optional().describe('Two-letter state or province abbreviation.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the created vendor.'),
        name: z.string().describe('Name of the created vendor.'),
        country: z.string().describe('Two-letter country code of the vendor.'),
        state: z.string().optional().describe('Two-letter US state abbreviation of the vendor.'),
        is_active: z.boolean().describe('Whether the vendor is active.'),
        is_deletable: z.boolean().describe('Whether the vendor can be deleted.'),
        external_vendor_id: z.string().optional().describe('Customer-defined external identifier for the vendor.'),
        net_payment_terms: z.number().optional().describe('Number of days after receipt that payment is due.'),
        default_entity_id: z.string().optional().describe('ID of the default business entity associated with the vendor.'),
        parent_vendor_id: z.string().optional().describe('ID of the parent vendor, if any.'),
        vendor_owner_id: z.string().optional().describe('ID of the Ramp user who owns the vendor.'),
        contacts: z.array(z.string()).describe('Unique identifiers of contacts associated with the vendor.'),
        address: VendorAddressOutputSchema.optional().describe('Default mailing address of the vendor.'),
        created_at: z.string().describe('Date and time when the vendor was created.'),
        updated_at: z.string().optional().describe('Date and time when the vendor was last updated.')
    })
    .describe('The newly created vendor.');

/**
 * @tags: [write]
 * @tagReason: Creates a new vendor record in the provider.
 * @pitfalls: For country "US", state (a two-letter abbreviation) is required in practice even though the schema marks it optional; omitting it fails with a DEVELOPER_7080 error. The returned vendor contains contact IDs only, not the contact details supplied in the request.
 */
const action = createAction({
    description: 'Create a new vendor with a primary contact.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.country.toUpperCase() === 'US' && !input.state) {
            throw new nango.ActionError({
                type: 'missing_state',
                message: 'state is required when country is "US".'
            });
        }

        const response = await nango.post({
            // Docs: https://docs.ramp.com/openapi/developer-api.json (POST /developer/v1/vendors)
            endpoint: '/developer/v1/vendors',
            data: {
                name: input.name,
                country: input.country,
                business_vendor_contacts: {
                    email: input.business_vendor_contacts.email,
                    ...(input.business_vendor_contacts.first_name !== undefined && { first_name: input.business_vendor_contacts.first_name }),
                    ...(input.business_vendor_contacts.last_name !== undefined && { last_name: input.business_vendor_contacts.last_name }),
                    ...(input.business_vendor_contacts.phone !== undefined && { phone: input.business_vendor_contacts.phone })
                },
                ...(input.state !== undefined && { state: input.state }),
                ...(input.net_payment_terms !== undefined && { net_payment_terms: input.net_payment_terms }),
                ...(input.external_vendor_id !== undefined && { external_vendor_id: input.external_vendor_id }),
                ...(input.default_entity_id !== undefined && { default_entity_id: input.default_entity_id }),
                ...(input.vendor_owner_id !== undefined && { vendor_owner_id: input.vendor_owner_id }),
                ...(input.request_payment_details !== undefined && { request_payment_details: input.request_payment_details }),
                ...(input.request_tax_details !== undefined && { request_tax_details: input.request_tax_details }),
                ...(input.address !== undefined && {
                    address: {
                        address_line_1: input.address.address_line_1,
                        ...(input.address.address_line_2 !== undefined && { address_line_2: input.address.address_line_2 }),
                        city: input.address.city,
                        country: input.address.country,
                        postal_code: input.address.postal_code,
                        ...(input.address.state !== undefined && { state: input.address.state })
                    }
                })
            },
            // Creating a vendor is not idempotent and the API has no idempotency key, so a retry after a lost response could create a duplicate.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const vendor = ProviderVendorSchema.parse(response.data);

        return {
            id: vendor.id,
            name: vendor.name,
            country: vendor.country,
            ...(vendor.state != null && { state: vendor.state }),
            is_active: vendor.is_active,
            is_deletable: vendor.is_deletable,
            ...(vendor.external_vendor_id != null && { external_vendor_id: vendor.external_vendor_id }),
            ...(vendor.net_payment_terms != null && { net_payment_terms: vendor.net_payment_terms }),
            ...(vendor.default_entity_id != null && { default_entity_id: vendor.default_entity_id }),
            ...(vendor.parent_vendor_id != null && { parent_vendor_id: vendor.parent_vendor_id }),
            ...(vendor.vendor_owner_id != null && { vendor_owner_id: vendor.vendor_owner_id }),
            contacts: vendor.contacts ?? [],
            ...(vendor.address != null && {
                address: {
                    address_line_1: vendor.address.address_line_1,
                    ...(vendor.address.address_line_2 != null && { address_line_2: vendor.address.address_line_2 }),
                    city: vendor.address.city,
                    country: vendor.address.country,
                    postal_code: vendor.address.postal_code,
                    ...(vendor.address.state != null && { state: vendor.address.state })
                }
            }),
            created_at: vendor.created_at,
            ...(vendor.updated_at != null && { updated_at: vendor.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
