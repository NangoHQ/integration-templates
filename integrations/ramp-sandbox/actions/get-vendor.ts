import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        vendor_id: z.string().describe('Unique identifier of the vendor to retrieve. Example: "4f08baf7-e3f0-4271-aedd-4d2c2214ed9a"')
    })
    .describe('Input for retrieving a single Ramp vendor by ID.');

const AddressSchema = z.object({
    address_line_1: z.string().optional().describe('Primary address line, such as the street and number.'),
    address_line_2: z.string().nullable().optional().describe('Secondary address line, such as a suite or unit number.'),
    city: z.string().optional().describe('City of the address.'),
    country: z.string().optional().describe('Two-letter ISO country code of the address.'),
    postal_code: z.string().optional().describe('Postal or ZIP code of the address.'),
    state: z.string().nullable().optional().describe('State or province code of the address.')
});

const VendorAddressSchema = AddressSchema.extend({
    id: z.string().optional().describe('Unique identifier of this vendor address.'),
    is_default: z.boolean().optional().describe('Whether this is the vendor default address.')
});

const CurrencyAmountSchema = z.object({
    amount: z.number().optional().describe('Monetary amount in the currency smallest denomination (for USD, cents).'),
    currency_code: z.string().optional().describe('ISO 4217 currency code, such as "USD".'),
    minor_unit_conversion_rate: z.number().nullable().optional().describe('Divisor that converts the amount to the major currency value (100 for USD).')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the vendor.'),
        name: z.string().describe('Display name of the vendor.'),
        name_legal: z.string().nullable().optional().describe('Legal name of the vendor.'),
        description: z.string().nullable().optional().describe('Free-text description of the vendor.'),
        status: z.string().optional().describe('Current vendor status, such as "ACTIVE".'),
        is_active: z.boolean().optional().describe('Whether the vendor is active.'),
        is_deletable: z.boolean().optional().describe('Whether the vendor can be deleted.'),
        vendor_type: z.string().nullable().optional().describe('Vendor type: "BUSINESS" or "INDIVIDUAL".'),
        vendor_owner_id: z.string().nullable().optional().describe('Unique identifier of the user who owns the vendor.'),
        country: z.string().optional().describe('Two-letter ISO country code of the vendor.'),
        state: z.string().nullable().optional().describe('State or province code of the vendor.'),
        address: AddressSchema.nullable().optional().describe('Default address of the vendor.'),
        addresses: z.array(VendorAddressSchema).optional().describe('All addresses on file for the vendor.'),
        tax_address: AddressSchema.nullable().optional().describe('Tax address of the vendor.'),
        contacts: z.array(z.string()).optional().describe('Unique identifiers of contacts associated with the vendor.'),
        external_vendor_id: z.string().nullable().optional().describe('Customer-defined external identifier for the vendor.'),
        accounting_vendor_remote_id: z.string().nullable().optional().describe('Remote identifier of the vendor in the connected accounting system.'),
        default_entity_id: z.string().nullable().optional().describe('Unique identifier of the default business entity for the vendor.'),
        parent_vendor_id: z.string().nullable().optional().describe('Unique identifier of the parent vendor, if any.'),
        merchant_id: z.string().nullable().optional().describe('Unique identifier of the associated card merchant, if any.'),
        sk_category_id: z.number().nullable().optional().describe('Ramp spend category code assigned to the vendor.'),
        sk_category_name: z.string().optional().describe('Name of the Ramp spend category assigned to the vendor.'),
        federal_tax_classification: z.string().nullable().optional().describe('Federal tax classification of the vendor.'),
        billing_frequency: z.string().nullable().optional().describe('Billing frequency for the vendor, such as "MONTHLY" or "ANNUAL".'),
        approval_status: z.string().optional().describe('Vendor approval status: "APPROVED", "PENDING", or "REJECTED".'),
        net_payment_terms: z.number().nullable().optional().describe('Days after receipt that payment is due; 0 means due on receipt.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the vendor was created.'),
        updated_at: z.string().nullable().optional().describe('ISO 8601 timestamp when the vendor was last updated.'),
        total_spend_all_time: CurrencyAmountSchema.optional().describe('Total spend with this vendor across all time.'),
        total_spend_last_30_days: CurrencyAmountSchema.optional().describe('Total spend with this vendor in the last 30 days.'),
        total_spend_last_365_days: CurrencyAmountSchema.optional().describe('Total spend with this vendor in the last 365 days.'),
        total_spend_ytd: CurrencyAmountSchema.optional().describe('Total spend with this vendor year to date.')
    })
    .describe('A single Ramp vendor with its addresses, accounting links, and spend totals.');

const ErrorWithResponseSchema = z.object({
    response: z.object({ status: z.number() }).optional()
});

function getErrorStatus(error: unknown): number | undefined {
    const parsed = ErrorWithResponseSchema.safeParse(error);
    return parsed.success ? parsed.data.response?.status : undefined;
}

async function fetchVendor(nango: NangoActionLocal, vendorId: string) {
    // @allowTryCatch: Map a provider 404 into a structured not_found ActionError so callers get a clear result instead of a raw proxy failure.
    try {
        // https://docs.ramp.com/developer-api/v1/api/vendors/get-vendor
        return await nango.get<unknown>({
            endpoint: `/developer/v1/vendors/${encodeURIComponent(vendorId)}`,
            retries: 3
        });
    } catch (error) {
        if (getErrorStatus(error) === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Vendor ${vendorId} was not found.`,
                vendor_id: vendorId
            });
        }
        throw error;
    }
}

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing vendor without modifying any provider state.
 * @pitfalls: A non-existent or hard-deleted vendor ID fails with a not-found error rather than an empty result, and all monetary totals are returned in the currency's minor units (for USD, cents).
 */
const action = createAction({
    description: 'Retrieve a single vendor by ID.',
    version: '1.0.0',
    scopes: ['vendors:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await fetchVendor(nango, input.vendor_id);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
