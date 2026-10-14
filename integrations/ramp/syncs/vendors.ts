import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OVERLAP_BUFFER_MS = 5 * 60 * 1000;
const PAGE_SIZE = 100;
const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const AddressSchema = z
    .object({
        address_line_1: z.string().describe('Primary street address line.'),
        address_line_2: z.string().nullable().optional().describe('Secondary address line, such as a suite or floor, when present.'),
        city: z.string().describe('City of the address.'),
        country: z.string().describe('Two-letter ISO 3166-1 country code of the address.'),
        postal_code: z.string().describe('Postal or ZIP code of the address.'),
        state: z.string().nullable().optional().describe('State or province of the address, when present.')
    })
    .describe('A mailing or tax address associated with a vendor.');

const VendorAddressSchema = z
    .object({
        id: z.string().describe('Unique identifier of the vendor address record.'),
        address_line_1: z.string().describe('Primary street address line.'),
        address_line_2: z.string().nullable().optional().describe('Secondary address line, such as a suite or floor, when present.'),
        city: z.string().describe('City of the address.'),
        country: z.string().describe('Two-letter ISO 3166-1 country code of the address.'),
        postal_code: z.string().describe('Postal or ZIP code of the address.'),
        state: z.string().nullable().optional().describe('State or province of the address, when present.'),
        is_default: z.boolean().describe('Whether this is the default address for the vendor.')
    })
    .describe('An address record belonging to a vendor.');

const CurrencyAmountSchema = z
    .object({
        amount: z.number().describe('Monetary amount expressed in the smallest currency unit (for USD, cents).'),
        currency_code: z.string().describe('ISO 4217 currency code of the amount, for example USD.'),
        minor_unit_conversion_rate: z
            .number()
            .nullable()
            .optional()
            .describe('Divisor that converts amount into the major currency unit, for example 100 for USD.')
    })
    .describe('A monetary amount together with its currency.');

const PaymentMethodPolicySchema = z
    .looseObject({
        kind: z.string().describe('Payment policy kind: ADDRESS, BANK_ACCOUNT, CARD, DIRECT_DEBIT, or MANUAL.')
    })
    .describe('Vendor default payment policy; the remaining fields depend on the policy kind.');

const DefaultPaymentMethodSchema = z
    .object({
        update_source: z.string().nullable().optional().describe('How the default payment method was last set, e.g. AUTO or MANUAL.'),
        policy: PaymentMethodPolicySchema.nullable().optional().describe('Payment policy details for the default payment method.')
    })
    .describe('The default payment method configured for a vendor.');

const VendorSchema = z
    .object({
        id: z.string().describe('Unique identifier of the vendor; use this as the stable sync key because vendor names are not unique.'),
        name: z.string().describe('Display name of the vendor.'),
        name_legal: z.string().nullable().optional().describe('Legal name of the vendor, when recorded.'),
        description: z.string().nullable().optional().describe('Free-text description of the vendor.'),
        accounting_vendor_remote_id: z
            .string()
            .nullable()
            .optional()
            .describe('Remote identifier of the vendor in the connected accounting system, when linked.'),
        external_vendor_id: z.string().nullable().optional().describe('Customer-defined external identifier for the vendor.'),
        country: z.string().describe('Two-letter ISO 3166-1 country code of the vendor.'),
        state: z.string().nullable().optional().describe('State or province of the vendor, when present.'),
        vendor_type: z.string().nullable().optional().describe('Vendor type when the vendor is used for Bill Pay, e.g. BUSINESS or INDIVIDUAL.'),
        status: z.string().nullable().optional().describe('Lifecycle status reported by Ramp, for example ACTIVE or UNMANAGED.'),
        is_active: z.boolean().describe('Whether the vendor is active.'),
        is_deletable: z.boolean().describe('Whether the vendor can be deleted.'),
        merchant_id: z.string().nullable().optional().describe('Identifier of the card merchant associated with the vendor, when present.'),
        net_payment_terms: z.number().nullable().optional().describe('Number of days after receipt that payment is due; 0 means due on receipt.'),
        parent_vendor_id: z.string().nullable().optional().describe('Identifier of the parent vendor, when this vendor belongs to a hierarchy.'),
        default_entity_id: z.string().nullable().optional().describe('Identifier of the default business entity for the vendor.'),
        vendor_owner_id: z.string().nullable().optional().describe('Identifier of the user who owns the vendor.'),
        federal_tax_classification: z.string().nullable().optional().describe('Federal tax classification of the vendor, when provided.'),
        sk_category_id: z.number().nullable().optional().describe('Ramp spend category code assigned to the vendor.'),
        sk_category_name: z.string().nullable().optional().describe('Human-readable Ramp spend category name for the vendor.'),
        billing_frequency: z.string().nullable().optional().describe('Billing frequency for the vendor, when set.'),
        contacts: z.array(z.string()).describe('Identifiers of the vendor contacts associated with this vendor.'),
        subsidiary: z.array(z.string()).optional().describe('ERP subsidiary identifiers, returned only when explicitly requested.'),
        address: AddressSchema.nullable().optional().describe('Default address of the vendor, when set.'),
        addresses: z.array(VendorAddressSchema).describe('All addresses associated with the vendor.'),
        tax_address: AddressSchema.nullable().optional().describe('Tax address of the vendor, when set.'),
        total_spend_all_time: CurrencyAmountSchema.describe('Total spend with this vendor for all time.'),
        total_spend_last_30_days: CurrencyAmountSchema.describe('Total spend with this vendor over the last 30 days.'),
        total_spend_last_365_days: CurrencyAmountSchema.describe('Total spend with this vendor over the last 365 days.'),
        total_spend_ytd: CurrencyAmountSchema.describe('Total spend with this vendor year-to-date.'),
        default_payment_method: DefaultPaymentMethodSchema.nullable().optional().describe('Default payment method configured for the vendor.'),
        created_at: z.string().describe('ISO 8601 timestamp when the vendor was created.'),
        updated_at: z.string().nullable().optional().describe('ISO 8601 timestamp when the vendor was last updated; drives the incremental sync.')
    })
    .describe('A Ramp vendor.');

const CheckpointSchema = z
    .object({
        updated_after: z
            .string()
            .describe('High-water mark ISO 8601 timestamp of the most recently completed scan; empty string when no completed scan exists.'),
        start: z.string().describe('Ramp pagination cursor (last entity id) for an interrupted scan; empty string when no scan is in progress.'),
        full_refresh_in_progress: z.boolean().describe('Whether the in-flight scan is a delete-tracked full refresh rather than an incremental scan.'),
        last_full_refresh_at: z.string().describe('ISO 8601 timestamp of the last completed full refresh; empty string when no full refresh has completed.'),
        delete_tracking_pending: z.boolean().describe('True when a full refresh saved every vendor but its delete-tracking window has not been closed yet.')
    })
    .describe('Incremental sync progress for vendors.');

const sync = createSync({
    description: 'Sync vendors incrementally by updated_at, with a daily full refresh that detects deleted vendors.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['vendors:read'],
    checkpoint: CheckpointSchema,
    models: {
        Vendor: VendorSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // A previous full refresh saved every vendor but failed before closing its delete-tracking window.
        // This run closes it at the end; that is safe because every vendor that still existed was saved inside
        // that window, and a full refresh started now reuses the still-open window.
        const pendingFromPreviousRun = checkpoint?.delete_tracking_pending === true;

        const highWater = checkpoint?.updated_after || undefined;
        const lastFullRefreshAt = checkpoint?.last_full_refresh_at || undefined;
        let start = checkpoint?.start || undefined;

        // DELETE /developer/v1/vendors/{id} hard-deletes the vendor: it 404s afterwards and is never
        // returned by the list endpoint again (with or without from_updated_at), so the incremental
        // scan cannot see deletions. A periodic unfiltered scan with delete tracking catches them.
        const lastFullRefreshMs = lastFullRefreshAt ? Date.parse(lastFullRefreshAt) : Number.NaN;
        const resumingFullRefresh = checkpoint?.full_refresh_in_progress === true;
        const fullRefresh = resumingFullRefresh || Number.isNaN(lastFullRefreshMs) || Date.now() - lastFullRefreshMs >= FULL_REFRESH_INTERVAL_MS;

        if (fullRefresh && !resumingFullRefresh) {
            // A new full refresh always starts from the first page; drop any interrupted incremental cursor.
            start = undefined;
        }

        if (fullRefresh) {
            // No-op when a window is already open, so a resumed full refresh keeps its original window.
            await nango.trackDeletesStart('Vendor');
        }

        const highWaterMs = highWater ? Date.parse(highWater) : undefined;
        let maxUpdatedAtMs = highWaterMs !== undefined && Number.isFinite(highWaterMs) ? highWaterMs : undefined;

        const fromUpdatedAt = !fullRefresh && maxUpdatedAtMs !== undefined ? new Date(maxUpdatedAtMs - OVERLAP_BUFFER_MS).toISOString() : undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/vendors)
            endpoint: '/developer/v1/vendors',
            params: {
                ...(fromUpdatedAt && { from_updated_at: fromUpdatedAt }),
                ...(start && { start })
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'page.next',
                response_path: 'data',
                limit_name_in_request: 'page_size',
                limit: PAGE_SIZE,
                on_page: async ({ nextPageParam }) => {
                    start =
                        typeof nextPageParam === 'string' ? (new URL(nextPageParam, 'https://ramp.invalid').searchParams.get('start') ?? undefined) : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            const vendors = page.map((item) => {
                const vendor = VendorSchema.parse(item);

                if (vendor.updated_at) {
                    const updatedAtMs = Date.parse(vendor.updated_at);
                    if (Number.isFinite(updatedAtMs) && (maxUpdatedAtMs === undefined || updatedAtMs > maxUpdatedAtMs)) {
                        maxUpdatedAtMs = updatedAtMs;
                    }
                }

                return vendor;
            });

            if (vendors.length === 0) {
                continue;
            }

            await nango.batchSave(vendors, 'Vendor');

            if (start !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: highWater ?? '',
                    start,
                    full_refresh_in_progress: fullRefresh,
                    last_full_refresh_at: lastFullRefreshAt ?? '',
                    delete_tracking_pending: pendingFromPreviousRun
                });
            }
        }

        // Persist the completed scan before closing the delete-tracking window, so a failure in between
        // can never make a later run resume a half-finished walk under a fresh window. The pending flag
        // makes the next run close the window if trackDeletesEnd fails here.
        const completed = {
            updated_after: maxUpdatedAtMs !== undefined ? new Date(maxUpdatedAtMs).toISOString() : '',
            start: '',
            full_refresh_in_progress: false,
            last_full_refresh_at: fullRefresh ? new Date().toISOString() : (lastFullRefreshAt ?? '')
        };
        const closeDeleteTracking = fullRefresh || pendingFromPreviousRun;
        await nango.saveCheckpoint({ ...completed, delete_tracking_pending: closeDeleteTracking });

        if (closeDeleteTracking) {
            await nango.trackDeletesEnd('Vendor');
            await nango.saveCheckpoint({ ...completed, delete_tracking_pending: false });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
