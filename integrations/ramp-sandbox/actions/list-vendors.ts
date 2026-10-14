import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the smallest currency unit (for USD, cents). Example: 18500 means 185.00 USD.'),
    currency_code: z.string().describe('ISO 4217 currency code of the amount. Example: "USD".'),
    minor_unit_conversion_rate: z.number().nullable().describe('Divisor that converts `amount` to the major currency value (100 for USD).')
});

const AddressSchema = z.object({
    address_line_1: z.string().optional().describe('Primary address line.'),
    address_line_2: z.string().nullable().optional().describe('Secondary address line, when present.'),
    city: z.string().optional().describe('City.'),
    state: z.string().nullable().optional().describe('State or province.'),
    postal_code: z.string().optional().describe('Postal or ZIP code.'),
    country: z.string().optional().describe('Two-letter country code.')
});

const VendorAddressSchema = z.object({
    id: z.string().describe('Unique identifier of the vendor address.'),
    address_line_1: z.string().optional().describe('Primary address line.'),
    address_line_2: z.string().nullable().optional().describe('Secondary address line, when present.'),
    city: z.string().optional().describe('City.'),
    state: z.string().nullable().optional().describe('State or province.'),
    postal_code: z.string().optional().describe('Postal or ZIP code.'),
    country: z.string().optional().describe('Two-letter country code.'),
    is_default: z.boolean().optional().describe('Whether this is the vendor default address.')
});

const PaymentPolicySchema = z.object({
    kind: z.string().describe('Payment policy kind: "ADDRESS", "BANK_ACCOUNT", "CARD", "DIRECT_DEBIT", or "MANUAL".'),
    data: z.record(z.string(), z.unknown()).nullable().optional().describe('Kind-specific policy details, such as the bank account or address used.'),
    card_payment_method: z.string().nullable().optional().describe('Card payment method for a "CARD" policy.'),
    payment_method: z.string().nullable().optional().describe('Payment method for a "DIRECT_DEBIT" policy.')
});

const DefaultPaymentMethodSchema = z.object({
    update_source: z.string().nullable().optional().describe('How the default payment method was set: "AUTO" or "MANUAL".'),
    policy: PaymentPolicySchema.nullable().optional().describe('Payment policy for the vendor, including its kind.')
});

const VendorSchema = z.object({
    id: z.string().describe('Unique identifier of the vendor.'),
    name: z.string().describe('Name of the vendor. Not unique: multiple vendors can share the same name.'),
    name_legal: z.string().nullable().optional().describe('Legal name of the vendor.'),
    description: z.string().nullable().optional().describe('Free-text description of the vendor.'),
    external_vendor_id: z.string().nullable().describe('Customer-defined external identifier, independent of accounting system IDs.'),
    accounting_vendor_remote_id: z.string().nullable().describe('Accounting-system remote identifier for the vendor.'),
    status: z.string().optional().describe('Vendor status reported by the API, such as "UNMANAGED".'),
    is_active: z.boolean().describe('Whether the vendor is active.'),
    is_deletable: z.boolean().describe('Whether the vendor can be deleted.'),
    country: z.string().describe('Two-letter country code of the vendor.'),
    state: z.string().nullable().optional().describe('State or province of the vendor.'),
    vendor_type: z.string().nullable().optional().describe('Vendor type for bill pay: "BUSINESS" or "INDIVIDUAL".'),
    billing_frequency: z.string().nullable().optional().describe('Billing frequency for this vendor, such as "MONTHLY" or "ANNUAL".'),
    federal_tax_classification: z.string().nullable().optional().describe('Federal tax classification, such as "C_CORPORATION" or "PARTNERSHIP".'),
    net_payment_terms: z.number().nullable().optional().describe('Number of days after receipt that payment is due; 0 means due on receipt.'),
    sk_category_id: z.number().nullable().optional().describe('Ramp category code of the vendor.'),
    sk_category_name: z.string().nullable().optional().describe('Ramp category name of the vendor.'),
    merchant_id: z.string().nullable().optional().describe('Identifier of the associated card merchant, when present.'),
    parent_vendor_id: z.string().nullable().describe('Identifier of the parent vendor, when this vendor has one.'),
    vendor_owner_id: z.string().nullable().describe('Identifier of the user who owns the vendor.'),
    default_entity_id: z.string().nullable().describe('Identifier of the default business entity associated with the vendor.'),
    contacts: z.array(z.string()).describe('Identifiers of contacts associated with the vendor.'),
    address: AddressSchema.nullable().optional().describe('Default address of the vendor, when set.'),
    addresses: z.array(VendorAddressSchema).describe('All addresses saved for the vendor.'),
    tax_address: AddressSchema.nullable().optional().describe('Tax address of the vendor, when set.'),
    default_payment_method: DefaultPaymentMethodSchema.nullable().describe('Default payment method for the vendor, when configured.'),
    total_spend_all_time: CurrencyAmountSchema.describe('Total spend with this vendor for all time.'),
    total_spend_last_30_days: CurrencyAmountSchema.describe('Total spend with this vendor over the last 30 days.'),
    total_spend_last_365_days: CurrencyAmountSchema.describe('Total spend with this vendor over the last 365 days.'),
    total_spend_ytd: CurrencyAmountSchema.describe('Total spend with this vendor year-to-date.'),
    subsidiary: z.array(z.string()).optional().describe('ERP subsidiary identifiers, returned only when include_subsidiary is true.'),
    created_at: z.string().describe('ISO-8601 datetime when the vendor was created.'),
    updated_at: z.string().nullable().describe('ISO-8601 datetime when the vendor was last updated.')
});

const ProviderPageSchema = z.object({
    next: z.string().nullable()
});

const ProviderResponseSchema = z.object({
    data: z.array(VendorSchema),
    page: ProviderPageSchema
});

const InputSchema = z
    .object({
        name: z.string().optional().describe('Filter by exact vendor name. Names are not unique, so several vendors can share the same name.'),
        external_vendor_id: z.string().optional().describe('Filter by customer-defined external vendor ID.'),
        merchant_id: z.string().optional().describe('Filter by the identifier of a card merchant associated with the vendor.'),
        vendor_owner_id: z.string().optional().describe('Filter by the identifier of the user who owns the vendor.'),
        accounting_vendor_remote_ids: z.array(z.string()).optional().describe('Only return vendors whose accounting remote id is in this list.'),
        vendor_tracking_category_option_ids: z
            .array(z.string())
            .optional()
            .describe('Only return vendors whose accounting field selection id is in this list.'),
        sk_category_ids: z.array(z.number().int()).optional().describe('Only return vendors whose Ramp category code is in this list.'),
        is_active: z.boolean().optional().describe('When set, only return vendors matching this active state.'),
        from_created_at: z.string().optional().describe('Only return vendors created after this ISO-8601 datetime.'),
        to_created_at: z.string().optional().describe('Only return vendors created on or before this ISO-8601 datetime.'),
        from_updated_at: z.string().optional().describe('Only return vendors updated after this ISO-8601 datetime.'),
        to_updated_at: z.string().optional().describe('Only return vendors updated on or before this ISO-8601 datetime.'),
        include_subsidiary: z.boolean().optional().describe('When true, include ERP subsidiary identifiers for each vendor.'),
        include_draft: z.boolean().optional().describe('When true, include vendors that are not yet fully approved and published.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of vendors to return per page, between 2 and 100. Defaults to 20.'),
        cursor: z.uuid().optional().describe('Pagination cursor returned as `next_cursor` by a previous call. Omit to fetch the first page.')
    })
    .describe('Filters and pagination for listing vendors.');

const OutputSchema = z
    .object({
        vendors: z.array(VendorSchema).describe('Vendors (payees for bills and purchase orders) matching the filters for this page.'),
        next_cursor: z.string().nullable().describe('Cursor to pass as `cursor` to fetch the next page, or null when there are no more pages.')
    })
    .describe('A page of vendors plus the cursor for the next page.');

/**
 * @tags: [read]
 * @tagReason: Lists vendors from the provider without mutating any provider state.
 * @pitfalls: Vendor `name` is not unique, so a name filter can return multiple distinct vendors that share the same name; disambiguate by `id`. Vendors that are still drafts or awaiting approval are excluded unless `include_draft` is true, so a just-created vendor may not appear immediately. Date filters require a full ISO-8601 datetime.
 */
const action = createAction({
    description: 'List vendors (payees for bills and purchase orders).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.name !== undefined) {
            params['name'] = input.name;
        }
        if (input.external_vendor_id !== undefined) {
            params['external_vendor_id'] = input.external_vendor_id;
        }
        if (input.merchant_id !== undefined) {
            params['merchant_id'] = input.merchant_id;
        }
        if (input.vendor_owner_id !== undefined) {
            params['vendor_owner_id'] = input.vendor_owner_id;
        }
        if (input.accounting_vendor_remote_ids !== undefined) {
            params['accounting_vendor_remote_ids'] = input.accounting_vendor_remote_ids.join(',');
        }
        if (input.vendor_tracking_category_option_ids !== undefined) {
            params['vendor_tracking_category_option_ids'] = input.vendor_tracking_category_option_ids.join(',');
        }
        if (input.sk_category_ids !== undefined) {
            params['sk_category_ids'] = input.sk_category_ids.join(',');
        }
        if (input.is_active !== undefined) {
            params['is_active'] = String(input.is_active);
        }
        if (input.from_created_at !== undefined) {
            params['from_created_at'] = input.from_created_at;
        }
        if (input.to_created_at !== undefined) {
            params['to_created_at'] = input.to_created_at;
        }
        if (input.from_updated_at !== undefined) {
            params['from_updated_at'] = input.from_updated_at;
        }
        if (input.to_updated_at !== undefined) {
            params['to_updated_at'] = input.to_updated_at;
        }
        if (input.include_subsidiary !== undefined) {
            params['include_subsidiary'] = String(input.include_subsidiary);
        }
        if (input.include_draft !== undefined) {
            params['include_draft'] = String(input.include_draft);
        }
        if (input.page_size !== undefined) {
            params['page_size'] = input.page_size;
        }
        if (input.cursor !== undefined) {
            params['start'] = input.cursor;
        }

        // Ramp API docs: https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/vendors)
        const response = await nango.get({
            endpoint: '/developer/v1/vendors',
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        let next_cursor: string | null = null;
        if (parsed.page.next && URL.canParse(parsed.page.next)) {
            next_cursor = new URL(parsed.page.next).searchParams.get('start');
        }

        return {
            vendors: parsed.data,
            next_cursor
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
