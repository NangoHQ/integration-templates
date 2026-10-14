import { createAction } from 'nango';
import { z } from 'zod';

const AddressInputSchema = z
    .object({
        address_line_1: z.string().min(1).describe('Primary street address line. Example: "100 Market St".'),
        address_line_2: z.string().nullable().optional().describe('Secondary address line such as a suite or unit. Pass null to clear it.'),
        city: z.string().min(1).describe('City of the address. Example: "San Francisco".'),
        country: z.string().min(2).describe('Two-letter country code. Example: "US".'),
        postal_code: z.string().min(1).describe('Postal or ZIP code. Example: "94105".'),
        state: z.string().nullable().optional().describe('Two-letter state or province abbreviation. Example: "CA". Pass null to clear it.')
    })
    .describe('Replacement default address for the vendor.');

const AddressOutputSchema = z
    .object({
        address_line_1: z.string().describe('Primary street address line.'),
        address_line_2: z.string().nullable().optional().describe('Secondary address line such as a suite or unit.'),
        city: z.string().describe('City of the address.'),
        country: z.string().describe('Two-letter country code.'),
        postal_code: z.string().describe('Postal or ZIP code.'),
        state: z.string().nullable().optional().describe('Two-letter state or province abbreviation.')
    })
    .describe('Default address of the vendor.');

const InputSchema = z
    .object({
        vendor_id: z.string().min(1).describe('Unique identifier of the vendor to update. Example: "4f08baf7-e3f0-4271-aedd-4d2c2214ed9a".'),
        name: z.string().min(1).optional().describe('New vendor name. Omit to leave the current name unchanged.'),
        description: z.string().optional().describe('New vendor description. Omit to leave the current description unchanged.'),
        address: AddressInputSchema.optional().describe(
            'Replacement default address for the vendor. When provided, address_line_1, city, country and postal_code are all required; omit to leave the current address unchanged.'
        ),
        net_payment_terms: z
            .number()
            .int()
            .min(0)
            .nullable()
            .optional()
            .describe('Number of days after receipt that payment is due; 0 means due on receipt. Pass null to clear the terms, omit to leave them unchanged.'),
        is_active: z.boolean().optional().describe('Whether the vendor is active. Omit to leave the current status unchanged.'),
        country: z.string().min(2).optional().describe('New two-letter country code for the vendor. Omit to leave it unchanged.'),
        state: z
            .string()
            .nullable()
            .optional()
            .describe(
                'New two-letter US state abbreviation for the vendor. Required (non-null) whenever country is "US", even if the vendor already has a state. Ignored by Ramp for non-US vendors. Omit to leave it unchanged.'
            ),
        external_vendor_id: z
            .string()
            .nullable()
            .optional()
            .describe('Customer-defined external identifier for the vendor. Pass null to clear it, omit to leave it unchanged.'),
        default_entity_id: z
            .string()
            .nullable()
            .optional()
            .describe('Business entity ID to set as the vendor default. Pass null to clear it, omit to leave it unchanged.')
    })
    .describe('Fields to update on an existing Ramp vendor; any omitted field is left unchanged.');

const ProviderVendorSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    is_active: z.boolean(),
    country: z.string(),
    state: z.string().nullable().optional(),
    net_payment_terms: z.number().nullable().optional(),
    external_vendor_id: z.string().nullable().optional(),
    default_entity_id: z.string().nullable().optional(),
    address: AddressOutputSchema.nullable().optional(),
    status: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the updated vendor.'),
        name: z.string().describe('Vendor name after the update.'),
        description: z.string().nullable().optional().describe('Vendor description after the update; null when unset.'),
        is_active: z.boolean().describe('Whether the vendor is active after the update.'),
        country: z.string().describe('Two-letter country code of the vendor.'),
        state: z.string().nullable().optional().describe('Vendor-level two-letter US state abbreviation; null when unset.'),
        net_payment_terms: z.number().nullable().optional().describe('Payment terms in days after the update; null when no terms are set.'),
        external_vendor_id: z.string().nullable().optional().describe('Customer-defined external vendor identifier; null when unset.'),
        default_entity_id: z.string().nullable().optional().describe('Default business entity ID associated with the vendor; null when unset.'),
        address: AddressOutputSchema.nullable().optional().describe('Default address of the vendor after the update; null when none is set.'),
        status: z.string().optional().describe('Vendor status reported by Ramp, for example "ACTIVE".'),
        created_at: z.string().describe('ISO-8601 timestamp when the vendor was created.'),
        updated_at: z.string().nullable().optional().describe('ISO-8601 timestamp when the vendor was last updated.')
    })
    .describe('Updated Ramp vendor.');

/**
 * @tags: [write]
 * @tagReason: Updates fields on an existing vendor through a provider mutation and does not read the vendor beforehand or delete any provider data.
 * @pitfalls: Providing address replaces the entire default address (address_line_1, city, country and postal_code must all be sent together) and does not change the separate vendor-level state field; omitting a field leaves it unchanged while passing null clears net_payment_terms, external_vendor_id or default_entity_id; sending country "US" requires a non-null state in the same call, and Ramp ignores state=null on a US vendor rather than clearing it.
 */
const action = createAction({
    description: 'Update a vendor (name, address, payment terms, or active status) in Ramp.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vendors:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Ramp rejects any PATCH that sets country "US" without a non-null state (DEVELOPER_7080), even when the vendor already has a state.
        if (input.country?.toUpperCase() === 'US' && input.state == null) {
            throw new nango.ActionError({
                type: 'missing_state',
                message: 'state (a two-letter US state abbreviation) is required whenever country is set to "US".'
            });
        }

        const data = {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.address !== undefined && { address: input.address }),
            ...(input.net_payment_terms !== undefined && { net_payment_terms: input.net_payment_terms }),
            ...(input.is_active !== undefined && { is_active: input.is_active }),
            ...(input.country !== undefined && { country: input.country }),
            ...(input.state !== undefined && { state: input.state }),
            ...(input.external_vendor_id !== undefined && { external_vendor_id: input.external_vendor_id }),
            ...(input.default_entity_id !== undefined && { default_entity_id: input.default_entity_id })
        };

        // https://docs.ramp.com/developer-api/v1/overview/introduction - PATCH /developer/v1/vendors/{vendor_id}
        const response = await nango.patch({
            endpoint: `/developer/v1/vendors/${encodeURIComponent(input.vendor_id)}`,
            data,
            retries: 3
        });

        const vendor = ProviderVendorSchema.parse(response.data);

        return {
            id: vendor.id,
            name: vendor.name,
            ...(vendor.description !== undefined && { description: vendor.description }),
            is_active: vendor.is_active,
            country: vendor.country,
            ...(vendor.state !== undefined && { state: vendor.state }),
            ...(vendor.net_payment_terms !== undefined && { net_payment_terms: vendor.net_payment_terms }),
            ...(vendor.external_vendor_id !== undefined && { external_vendor_id: vendor.external_vendor_id }),
            ...(vendor.default_entity_id !== undefined && { default_entity_id: vendor.default_entity_id }),
            ...(vendor.address !== undefined && { address: vendor.address }),
            ...(vendor.status !== undefined && { status: vendor.status }),
            created_at: vendor.created_at,
            ...(vendor.updated_at !== undefined && { updated_at: vendor.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
