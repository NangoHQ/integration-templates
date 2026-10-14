import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TRANSACTIONS_ENDPOINT = '/developer/v1/transactions';
const PAGE_SIZE = 100;
const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const OVERLAP_MS = 6 * 60 * 60 * 1000;

const SignedAmountSchema = z
    .object({
        currency: z.string().describe('ISO 4217 currency code of the amount, e.g. "USD".'),
        value: z.number().describe('Amount in the smallest unit of the currency (e.g. cents for USD); signed so refunds and credits can be negative.')
    })
    .describe('A signed monetary amount and the currency it is expressed in.');

const CurrencyAmountSchema = z
    .object({
        amount: z.number().describe('Amount in the smallest unit of the currency (e.g. cents for USD).'),
        currency_code: z.string().describe('ISO 4217 currency code of the amount, e.g. "USD".'),
        minor_unit_conversion_rate: z.number().nullable().describe('Conversion factor from minor units to the currency value (e.g. 100 for USD).')
    })
    .describe('A monetary amount, its currency, and the minor-unit conversion rate.');

const CardHolderSchema = z
    .object({
        user_id: z.string().describe('Ramp user identifier of the card holder.'),
        first_name: z.string().describe('First name of the card holder.'),
        last_name: z.string().describe('Last name of the card holder.'),
        department_id: z.string().describe('Identifier of the department the card holder belongs to.'),
        department_name: z.string().describe('Name of the department the card holder belongs to.'),
        location_id: z.string().describe('Identifier of the location the card holder belongs to.'),
        location_name: z.string().describe('Name of the location the card holder belongs to.'),
        employee_id: z.string().nullable().describe('External employee identifier of the card holder, when available.')
    })
    .describe('Information about the card holder who made the transaction.');

const MerchantLocationSchema = z
    .object({
        city: z.string().nullable().describe('City where the transaction was accepted.'),
        country: z.string().nullable().describe('Country where the transaction was accepted.'),
        postal_code: z.string().nullable().describe('Postal code where the transaction was accepted.'),
        state: z.string().nullable().describe('State or region where the transaction was accepted.')
    })
    .describe('Card acceptor location (city, country, state, postal code).');

const AttendeeSchema = z
    .object({
        name: z.string().describe('Name of the attendee.'),
        user_id: z.string().nullable().describe('Ramp user identifier of the attendee, or null for attendees without a Ramp account.')
    })
    .describe('A person associated with the transaction.');

const AccountingCategoryInfoSchema = z
    .object({
        id: z.string().optional().describe('Identifier of the accounting category.'),
        name: z.string().optional().describe('Name of the accounting category.'),
        external_id: z.string().optional().describe('External identifier of the accounting category in the accounting provider.'),
        type: z.string().optional().describe('Type of the accounting category, e.g. "GL_ACCOUNT" or "SUBSIDIARY".')
    })
    .describe('Category information for an accounting field selection.');

const AccountingFieldSelectionSchema = z
    .object({
        id: z.string().optional().describe('Identifier of the accounting field selection.'),
        name: z.string().optional().describe('Name of the accounting field selection.'),
        display_name: z.string().nullable().describe('Display name of the accounting field selection.'),
        external_id: z.string().optional().describe('External identifier of the accounting field selection in the accounting provider.'),
        external_code: z.string().optional().describe('External code of the accounting field selection in the accounting provider.'),
        provider_name: z.string().describe('Name of the accounting provider, e.g. "QuickBooks", "Xero" or "NetSuite".'),
        type: z.string().optional().describe('Type of the accounting field selection.'),
        category_info: AccountingCategoryInfoSchema.optional().describe('Category information associated with this accounting field selection.'),
        source: z
            .object({
                type: z.string().optional().describe('Source type that produced this accounting field selection.')
            })
            .optional()
            .describe('Source that produced this accounting field selection.')
    })
    .describe('An accounting field selected to code the transaction or one of its line items.');

const AccountingCategorySchema = z
    .object({
        category_id: z.string().optional().describe('Identifier of the accounting category.'),
        category_name: z.string().optional().describe('Name of the accounting category.'),
        tracking_category_remote_id: z.string().optional().describe('Remote identifier of the tracking category.'),
        tracking_category_remote_name: z.string().optional().describe('Remote name of the tracking category.'),
        tracking_category_remote_type: z.string().optional().describe('Remote type of the tracking category.')
    })
    .describe('A deprecated accounting category related to the transaction.');

const LineItemSchema = z
    .object({
        id: z.string().nullable().describe('Identifier of the line item.'),
        memo: z.string().optional().describe('Memo attached to the line item.'),
        amount: CurrencyAmountSchema.describe('Amount of the line item in the transaction currency.'),
        converted_amount: CurrencyAmountSchema.describe('Amount of the line item converted to the entity settlement currency.'),
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting fields selected to code the line item.')
    })
    .describe('A line item related to the transaction.');

const DisputeSchema = z
    .object({
        id: z.string().optional().describe('Identifier of the dispute.'),
        created_at: z.string().optional().describe('Time the dispute was created, in ISO 8601 format.'),
        type: z.string().optional().describe('Type of the dispute.'),
        memo: z.string().optional().describe('Memo attached to the dispute.')
    })
    .describe('A dispute filed for the transaction.');

const PolicyViolationSchema = z
    .object({
        id: z.string().optional().describe('Identifier of the policy violation.'),
        created_at: z.string().optional().describe('Time the policy violation was created, in ISO 8601 format.'),
        type: z.string().optional().describe('Type of the policy violation.'),
        memo: z.string().optional().describe('Memo attached to the policy violation.')
    })
    .describe('A policy violation flagged for the transaction.');

const DeclineDetailsSchema = z
    .object({
        reason: z.string().optional().describe('Reason the transaction was declined.'),
        amount: z.number().optional().describe('Amount that was declined, in the smallest unit of the currency.'),
        declined_amount: SignedAmountSchema.optional().describe('Declined amount and the currency it was declined in.')
    })
    .describe('Details about a declined transaction.');

const TransactionSchema = z
    .object({
        id: z.string().describe('Unique Ramp transaction identifier (UUID).'),
        user_transaction_time: z.string().describe('Time the transaction was created by the user, in ISO 8601 format.'),
        updated_at: z.string().nullable().describe('Approximate time the transaction was last updated, in ISO 8601 format.'),
        accounting_date: z.string().nullable().describe('Date used for the transaction for accounting purposes, in ISO 8601 format.'),
        settlement_date: z.string().nullable().optional().describe('Time funds were moved for the transaction, in ISO 8601 format.'),
        amount: z.number().optional().describe('Deprecated transaction amount. Use entity_amount instead.'),
        currency_code: z.string().optional().describe('Deprecated ISO 4217 currency code. Use entity_amount.currency instead.'),
        entity_amount: SignedAmountSchema.nullable().describe('Amount that settled to the entity, in the entity settlement currency.'),
        merchant_amount: SignedAmountSchema.nullable().describe('Original amount charged by the merchant, in the currency the merchant charged.'),
        original_transaction_amount: CurrencyAmountSchema.nullable().describe('Original transaction amount before any currency conversion.'),
        state: z.string().optional().describe('Transaction state, e.g. "CLEARED", "PENDING" or "DECLINED".'),
        sync_status: z.string().optional().describe('Accounting sync status: "NOT_SYNC_READY", "SYNC_READY" or "SYNCED".'),
        synced_at: z.string().nullable().describe('Time the transaction was synced to the accounting provider, in ISO 8601 format.'),
        all_requirements_met_and_approved: z
            .boolean()
            .optional()
            .describe('Whether the transaction is fully approved and all cardholder requirements are met.'),
        card_present: z.boolean().optional().describe('Whether the transaction was processed at a card-present terminal.'),
        card_id: z.string().optional().describe('Identifier of the physical or virtual card used for the transaction.'),
        card_holder: CardHolderSchema.nullable().optional().describe('Information about the card holder who made the transaction.'),
        fund_id: z.string().optional().describe('Identifier of the fund associated with the transaction.'),
        limit_id: z.string().optional().describe('Deprecated alias of fund_id.'),
        spend_program_id: z.string().optional().describe('Identifier of the spend program that issued the fund.'),
        entity_id: z.string().nullable().describe('Identifier of the business entity associated with the transaction.'),
        merchant_id: z.string().nullable().describe('Identifier of the merchant.'),
        merchant_name: z.string().nullable().optional().describe('Name of the merchant.'),
        merchant_descriptor: z.string().optional().describe('Merchant descriptor as it appears on the card statement.'),
        merchant_category_code: z.string().nullable().optional().describe('ISO 18245 merchant category code classifying the merchant.'),
        merchant_category_code_description: z.string().nullable().optional().describe('Description of the merchant category code.'),
        merchant_location: MerchantLocationSchema.nullable().describe('Card acceptor location (city, country, state, postal code) when available.'),
        network_merchant_id: z.string().nullable().describe('Network merchant identifier from the card acceptor.'),
        minor_unit_conversion_rate: z.number().nullable().describe('Conversion factor from minor units to the currency value (e.g. 100 for USD).'),
        sk_category_id: z.number().nullable().describe('Ramp category code assigned to the transaction.'),
        sk_category_name: z.string().nullable().describe('Ramp category name assigned to the transaction.'),
        memo: z.string().nullable().optional().describe('Cardholder memo attached to the transaction.'),
        statement_id: z.string().optional().describe('Identifier of the statement that contains the transaction.'),
        trip_id: z.string().nullable().describe('Identifier of the trip associated with the transaction.'),
        trip_name: z.string().nullable().describe('Name of the trip associated with the transaction.'),
        original_transaction_id: z.string().nullable().describe('Identifier of the original transaction for refund transactions.'),
        receipts: z.array(z.string()).optional().describe('Identifiers of the receipts attached to the transaction.'),
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).optional().describe('Accounting fields selected to code the transaction.'),
        accounting_categories: z.array(AccountingCategorySchema).optional().describe('Deprecated accounting categories related to the transaction.'),
        line_items: z.array(LineItemSchema).optional().describe('Line items related to the transaction.'),
        disputes: z.array(DisputeSchema).optional().describe('Disputes filed for the transaction, sorted newest first.'),
        policy_violations: z.array(PolicyViolationSchema).optional().describe('Policy violations flagged for the transaction, sorted newest first.'),
        attendees: z.array(AttendeeSchema).optional().describe('Attendees associated with the transaction, when applicable.'),
        decline_details: DeclineDetailsSchema.optional().describe('Details about the decline, present only for declined transactions.')
    })
    .describe('A single Ramp card transaction from the general ledger.');

// Checkpoint fields must be plain string/number/boolean values, so "unset" string fields use an empty string sentinel.
const CheckpointSchema = z.object({
    updated_after: z.string().describe('High-water mark: the maximum user_transaction_time seen so far, in ISO 8601 format, or empty when none has been seen.'),
    cursor: z.string().describe('Resume cursor (path and query) for an in-progress scan, or empty when there is no active scan.'),
    full_refresh_in_progress: z.boolean().describe('Whether the current run is an in-progress full refresh.'),
    last_full_refresh_at: z.string().describe('Time the last full refresh completed, in ISO 8601 format, or empty when no full refresh has completed.')
});

type Transaction = z.infer<typeof TransactionSchema>;
type Checkpoint = z.infer<typeof CheckpointSchema>;

function toCursorPath(link: string): string {
    if (link.startsWith('http://') || link.startsWith('https://')) {
        const url = new URL(link);
        return url.pathname + url.search;
    }
    return link;
}

function parseCursor(cursor: string): { endpoint: string; params: Record<string, string> } {
    const url = new URL(cursor, 'https://ramp.invalid');
    const params: Record<string, string> = {};
    for (const [key, value] of url.searchParams.entries()) {
        params[key] = value;
    }
    return { endpoint: url.pathname, params };
}

const sync = createSync({
    description: 'Sync Ramp card transactions, incrementally by user_transaction_time with a periodic full refresh.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Transaction: TransactionSchema
    },

    exec: async (nango) => {
        const checkpoint: Checkpoint | null = await nango.getCheckpoint();

        const checkpointUpdatedAfter = checkpoint?.updated_after !== undefined && checkpoint.updated_after !== '' ? checkpoint.updated_after : undefined;
        const checkpointCursor = checkpoint?.cursor !== undefined && checkpoint.cursor !== '' ? checkpoint.cursor : undefined;
        const checkpointLastFullRefreshAt =
            checkpoint?.last_full_refresh_at !== undefined && checkpoint.last_full_refresh_at !== '' ? checkpoint.last_full_refresh_at : undefined;

        let cursor: string | undefined = checkpointCursor;
        let fullRefresh = checkpoint?.full_refresh_in_progress === true;

        if (!fullRefresh) {
            const lastFullRefreshMs = checkpointLastFullRefreshAt ? Date.parse(checkpointLastFullRefreshAt) : Number.NaN;
            if (!checkpointLastFullRefreshAt || Number.isNaN(lastFullRefreshMs) || Date.now() - lastFullRefreshMs >= FULL_REFRESH_INTERVAL_MS) {
                fullRefresh = true;
            }
        }

        // An incremental run always restarts from the first page so its from_date window stays consistent;
        // only an in-progress full refresh may resume from the saved cursor.
        if (!fullRefresh) {
            cursor = undefined;
        }

        const updatedAfter = checkpointUpdatedAfter;
        let maxSeen = updatedAfter;

        const params: Record<string, string | number> = { page_size: PAGE_SIZE };
        if (!fullRefresh && updatedAfter !== undefined) {
            const updatedAfterMs = Date.parse(updatedAfter);
            if (!Number.isNaN(updatedAfterMs)) {
                params['from_date'] = new Date(updatedAfterMs - OVERLAP_MS).toISOString();
            }
        }

        let endpoint = TRANSACTIONS_ENDPOINT;
        if (cursor !== undefined) {
            const resumed = parseCursor(cursor);
            endpoint = resumed.endpoint;
            Object.assign(params, resumed.params);
        }

        const proxyConfig: ProxyConfiguration = {
            // Ramp API reference: https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/transactions - List transactions)
            endpoint,
            params,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'page.next',
                response_path: 'data',
                limit: PAGE_SIZE,
                limit_name_in_request: 'page_size',
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? toCursorPath(nextPageParam) : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            const records: Transaction[] = [];
            for (const item of page) {
                const parsed = TransactionSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Unexpected Ramp transaction payload: ${parsed.error.message}`);
                }
                records.push(parsed.data);
            }

            if (records.length === 0) {
                continue;
            }

            await nango.batchSave(records, 'Transaction');

            for (const record of records) {
                if (maxSeen === undefined || Date.parse(record.user_transaction_time) > Date.parse(maxSeen)) {
                    maxSeen = record.user_transaction_time;
                }
            }

            if (fullRefresh && cursor !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: maxSeen ?? '',
                    cursor,
                    full_refresh_in_progress: true,
                    last_full_refresh_at: checkpointLastFullRefreshAt ?? ''
                });
            }
        }

        const lastFullRefreshAt = fullRefresh ? new Date().toISOString() : (checkpointLastFullRefreshAt ?? '');
        await nango.saveCheckpoint({
            updated_after: maxSeen ?? '',
            cursor: '',
            full_refresh_in_progress: false,
            last_full_refresh_at: lastFullRefreshAt
        });
    }
});

export default sync;
