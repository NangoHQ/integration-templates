import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        vendor_id: z.string().describe('Unique identifier of the vendor to retrieve. Example: "4f08baf7-e3f0-4271-aedd-4d2c2214ed9a"')
    })
    .describe('Input for retrieving a single Ramp vendor by ID.');

const ProviderAddressSchema = z.object({
    address_line_1: z.string().optional(),
    address_line_2: z.string().nullable().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    postal_code: z.string().optional(),
    state: z.string().nullable().optional()
});

const ProviderVendorAddressSchema = ProviderAddressSchema.extend({
    id: z.string().optional(),
    is_default: z.boolean().optional()
});

const ProviderCurrencyAmountSchema = z.object({
    amount: z.number(),
    currency_code: z.string(),
    minor_unit_conversion_rate: z.number().nullable().optional()
});

// https://docs.ramp.com/openapi/developer-api.json - ApiVendorDetailResource. Fields the spec marks as non-nullable
// (name_legal, state, vendor_type, ...) are returned as null in practice, and sk_category_name is omitted when no category is set.
const ProviderVendorSchema = z.object({
    id: z.string(),
    name: z.string(),
    name_legal: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    is_active: z.boolean(),
    is_deletable: z.boolean(),
    vendor_type: z.string().nullable().optional(),
    vendor_owner_id: z.string().nullable(),
    country: z.string(),
    state: z.string().nullable().optional(),
    address: ProviderAddressSchema.nullable().optional(),
    addresses: z.array(ProviderVendorAddressSchema),
    tax_address: ProviderAddressSchema.nullable().optional(),
    contacts: z.array(z.string()),
    external_vendor_id: z.string().nullable(),
    accounting_vendor_remote_id: z.string().nullable(),
    default_entity_id: z.string().nullable(),
    parent_vendor_id: z.string().nullable(),
    merchant_id: z.string().nullable().optional(),
    sk_category_id: z.number().nullable().optional(),
    sk_category_name: z.string().nullable().optional(),
    federal_tax_classification: z.string().nullable().optional(),
    billing_frequency: z.string().nullable().optional(),
    approval_status: z.string().nullable().optional(),
    net_payment_terms: z.number().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string().nullable(),
    total_spend_all_time: ProviderCurrencyAmountSchema.optional(),
    total_spend_last_30_days: ProviderCurrencyAmountSchema.optional(),
    total_spend_last_365_days: ProviderCurrencyAmountSchema.optional(),
    total_spend_ytd: ProviderCurrencyAmountSchema.optional()
});

const AddressSchema = z.object({
    address_line_1: z.string().optional().describe('Primary address line, such as the street and number.'),
    address_line_2: z.string().optional().describe('Secondary address line, such as a suite or unit number. Omitted when not set.'),
    city: z.string().optional().describe('City of the address.'),
    country: z.string().optional().describe('Two-letter ISO country code of the address.'),
    postal_code: z.string().optional().describe('Postal or ZIP code of the address.'),
    state: z.string().optional().describe('State or province code of the address. Omitted when not set.')
});

const VendorAddressSchema = AddressSchema.extend({
    id: z.string().optional().describe('Unique identifier of this vendor address.'),
    is_default: z.boolean().optional().describe('Whether this is the vendor default address.')
});

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Monetary amount in the currency smallest denomination (for USD, cents).'),
    currency_code: z.string().describe('ISO 4217 currency code, such as "USD".'),
    minor_unit_conversion_rate: z
        .number()
        .optional()
        .describe('Divisor that converts the amount to the major currency value (100 for USD). Omitted when Ramp does not supply it.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the vendor.'),
        name: z.string().describe('Display name of the vendor.'),
        name_legal: z.string().optional().describe('Legal name of the vendor. Omitted when not set.'),
        description: z.string().optional().describe('Free-text description of the vendor. Omitted when not set.'),
        status: z.string().optional().describe('Current vendor status, such as "ACTIVE".'),
        is_active: z.boolean().describe('Whether the vendor is active.'),
        is_deletable: z.boolean().describe('Whether the vendor can be deleted.'),
        vendor_type: z.string().optional().describe('Vendor type: "BUSINESS" or "INDIVIDUAL". Omitted when not set.'),
        vendor_owner_id: z.string().optional().describe('Unique identifier of the user who owns the vendor. Omitted when the vendor has no owner.'),
        country: z.string().describe('Two-letter ISO country code of the vendor.'),
        state: z.string().optional().describe('State or province code of the vendor. Omitted when not set (always for non-US vendors).'),
        address: AddressSchema.optional().describe('Default address of the vendor. Omitted when none is set.'),
        addresses: z.array(VendorAddressSchema).describe('All addresses on file for the vendor.'),
        tax_address: AddressSchema.optional().describe('Tax address of the vendor. Omitted when none is set.'),
        contacts: z.array(z.string()).describe('Unique identifiers of contacts associated with the vendor.'),
        external_vendor_id: z.string().optional().describe('Customer-defined external identifier for the vendor. Omitted when not set.'),
        accounting_vendor_remote_id: z
            .string()
            .optional()
            .describe('Remote identifier of the vendor in the connected accounting system. Omitted when not linked.'),
        default_entity_id: z.string().optional().describe('Unique identifier of the default business entity for the vendor. Omitted when not set.'),
        parent_vendor_id: z.string().optional().describe('Unique identifier of the parent vendor. Omitted when the vendor has no parent.'),
        merchant_id: z.string().optional().describe('Unique identifier of the associated card merchant. Omitted when none is linked.'),
        sk_category_id: z.number().optional().describe('Ramp spend category code assigned to the vendor. Omitted when uncategorized.'),
        sk_category_name: z.string().optional().describe('Name of the Ramp spend category assigned to the vendor. Omitted when uncategorized.'),
        federal_tax_classification: z.string().optional().describe('Federal tax classification of the vendor. Omitted when not set.'),
        billing_frequency: z.string().optional().describe('Billing frequency for the vendor, such as "MONTHLY" or "ANNUAL". Omitted when not set.'),
        approval_status: z.string().optional().describe('Vendor approval status: "APPROVED", "PENDING", or "REJECTED".'),
        net_payment_terms: z.number().optional().describe('Days after receipt that payment is due; 0 means due on receipt. Omitted when no terms are set.'),
        created_at: z.string().describe('ISO 8601 timestamp when the vendor was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the vendor was last updated.'),
        total_spend_all_time: CurrencyAmountSchema.optional().describe('Total spend with this vendor across all time.'),
        total_spend_last_30_days: CurrencyAmountSchema.optional().describe('Total spend with this vendor in the last 30 days.'),
        total_spend_last_365_days: CurrencyAmountSchema.optional().describe('Total spend with this vendor in the last 365 days.'),
        total_spend_ytd: CurrencyAmountSchema.optional().describe('Total spend with this vendor year to date.')
    })
    .describe('A single Ramp vendor with its addresses, accounting links, and spend totals.');

function toAddress(address: z.infer<typeof ProviderAddressSchema>): z.infer<typeof AddressSchema> {
    return {
        ...(address.address_line_1 != null && { address_line_1: address.address_line_1 }),
        ...(address.address_line_2 != null && { address_line_2: address.address_line_2 }),
        ...(address.city != null && { city: address.city }),
        ...(address.country != null && { country: address.country }),
        ...(address.postal_code != null && { postal_code: address.postal_code }),
        ...(address.state != null && { state: address.state })
    };
}

function toCurrencyAmount(amount: z.infer<typeof ProviderCurrencyAmountSchema>): z.infer<typeof CurrencyAmountSchema> {
    return {
        amount: amount.amount,
        currency_code: amount.currency_code,
        ...(amount.minor_unit_conversion_rate != null && { minor_unit_conversion_rate: amount.minor_unit_conversion_rate })
    };
}

function toVendor(vendor: z.infer<typeof ProviderVendorSchema>): z.infer<typeof OutputSchema> {
    return {
        id: vendor.id,
        name: vendor.name,
        ...(vendor.name_legal != null && { name_legal: vendor.name_legal }),
        ...(vendor.description != null && { description: vendor.description }),
        ...(vendor.status != null && { status: vendor.status }),
        is_active: vendor.is_active,
        is_deletable: vendor.is_deletable,
        ...(vendor.vendor_type != null && { vendor_type: vendor.vendor_type }),
        ...(vendor.vendor_owner_id != null && { vendor_owner_id: vendor.vendor_owner_id }),
        country: vendor.country,
        ...(vendor.state != null && { state: vendor.state }),
        ...(vendor.address != null && { address: toAddress(vendor.address) }),
        addresses: vendor.addresses.map((address) => ({
            ...toAddress(address),
            ...(address.id != null && { id: address.id }),
            ...(address.is_default != null && { is_default: address.is_default })
        })),
        ...(vendor.tax_address != null && { tax_address: toAddress(vendor.tax_address) }),
        contacts: vendor.contacts,
        ...(vendor.external_vendor_id != null && { external_vendor_id: vendor.external_vendor_id }),
        ...(vendor.accounting_vendor_remote_id != null && { accounting_vendor_remote_id: vendor.accounting_vendor_remote_id }),
        ...(vendor.default_entity_id != null && { default_entity_id: vendor.default_entity_id }),
        ...(vendor.parent_vendor_id != null && { parent_vendor_id: vendor.parent_vendor_id }),
        ...(vendor.merchant_id != null && { merchant_id: vendor.merchant_id }),
        ...(vendor.sk_category_id != null && { sk_category_id: vendor.sk_category_id }),
        ...(vendor.sk_category_name != null && { sk_category_name: vendor.sk_category_name }),
        ...(vendor.federal_tax_classification != null && { federal_tax_classification: vendor.federal_tax_classification }),
        ...(vendor.billing_frequency != null && { billing_frequency: vendor.billing_frequency }),
        ...(vendor.approval_status != null && { approval_status: vendor.approval_status }),
        ...(vendor.net_payment_terms != null && { net_payment_terms: vendor.net_payment_terms }),
        created_at: vendor.created_at,
        ...(vendor.updated_at != null && { updated_at: vendor.updated_at }),
        ...(vendor.total_spend_all_time != null && { total_spend_all_time: toCurrencyAmount(vendor.total_spend_all_time) }),
        ...(vendor.total_spend_last_30_days != null && { total_spend_last_30_days: toCurrencyAmount(vendor.total_spend_last_30_days) }),
        ...(vendor.total_spend_last_365_days != null && { total_spend_last_365_days: toCurrencyAmount(vendor.total_spend_last_365_days) }),
        ...(vendor.total_spend_ytd != null && { total_spend_ytd: toCurrencyAmount(vendor.total_spend_ytd) })
    };
}

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
 * @pitfalls: A non-existent or hard-deleted vendor ID fails with a not-found error rather than an empty result; all monetary totals are returned in the currency's minor units (for USD, cents); fields Ramp returns as null (and sk_category_name for uncategorized vendors) are omitted from the output.
 */
const action = createAction({
    description: 'Retrieve a single vendor by ID.',
    version: '1.0.0',
    scopes: ['vendors:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await fetchVendor(nango, input.vendor_id);

        return toVendor(ProviderVendorSchema.parse(response.data));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
