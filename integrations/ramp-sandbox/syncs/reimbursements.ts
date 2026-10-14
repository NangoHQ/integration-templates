import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OVERLAP_BUFFER_MS = 2 * 60 * 1000;
const PAGE_SIZE = 100;

const AccountingCategoryInfoSchema = z
    .object({
        external_id: z.string().nullable().optional().describe('External ID that uniquely identifies this accounting field in the ERP.'),
        id: z.string().nullable().optional().describe('Unique identifier for this accounting field within Ramp.'),
        name: z.string().nullable().optional().describe('Name of the accounting field.'),
        type: z.string().nullable().optional().describe('Type of accounting field (e.g. GL_ACCOUNT, SUBSIDIARY, COST_CENTER).')
    })
    .describe('Information about the parent accounting category of an accounting field selection.');

const AccountingFieldSelectionSourceSchema = z
    .object({
        type: z.string().nullable().optional().describe('Describes the type of source that added this accounting coding selection.')
    })
    .describe('Source of an accounting coding selection.');

const AccountingFieldSelectionSchema = z
    .object({
        category_info: AccountingCategoryInfoSchema.nullable().optional().describe('Information about the parent accounting category.'),
        display_name: z.string().nullable().optional().describe('Customer-set display name for the accounting field option in Ramp.'),
        external_code: z.string().nullable().optional().describe('External code displayed in the ERP for this option.'),
        external_id: z.string().nullable().optional().describe('External ID that uniquely identifies this option in the ERP.'),
        id: z.string().nullable().optional().describe('Unique identifier for this option within Ramp.'),
        name: z.string().nullable().optional().describe('Name of the accounting field option.'),
        provider_name: z.string().nullable().optional().describe('Name of the accounting field provider.'),
        source: AccountingFieldSelectionSourceSchema.nullable().optional().describe('Source of this accounting coding selection.'),
        type: z.string().nullable().optional().describe('Type of accounting field (e.g. GL_ACCOUNT, SUBSIDIARY, COST_CENTER).')
    })
    .describe('An accounting field selected to code a reimbursement.');

const ReimbursementAmountSchema = z
    .object({
        currency: z.string().nullable().optional().describe('The currency of the amount in ISO 4217 format (e.g. USD).'),
        minor_unit_conversion_rate: z
            .number()
            .int()
            .nullable()
            .optional()
            .describe('Conversion factor from the integer value to the actual currency amount (e.g. 100 for USD).'),
        value: z.number().int().nullable().optional().describe('The amount in the smallest denomination of the currency (e.g. cents for USD).')
    })
    .describe('A monetary amount expressed in a specific currency.');

const CurrencyAmountSchema = z
    .object({
        amount: z.number().int().nullable().optional().describe('The amount of money in the smallest denomination of the currency (e.g. cents for USD).'),
        currency_code: z.string().nullable().optional().describe('The currency, in ISO 4217 format (e.g. USD).'),
        minor_unit_conversion_rate: z
            .number()
            .int()
            .nullable()
            .optional()
            .describe('Conversion factor from the integer amount to the actual currency value (e.g. 100 for USD).')
    })
    .describe('A monetary amount with its currency code.');

const AttendeeSchema = z
    .object({
        name: z.string().nullable().optional().describe('Full name of the attendee.'),
        user_id: z.string().nullable().optional().describe('Ramp user ID of the attendee, if the attendee is linked to a Ramp user.')
    })
    .describe('A person attending a reimbursement.');

const LineItemSchema = z
    .object({
        accounting_field_selections: z
            .array(AccountingFieldSelectionSchema)
            .nullable()
            .optional()
            .describe('Accounting field selections used to code this line item.'),
        amount: CurrencyAmountSchema.nullable().optional().describe('Amount of the line item.'),
        memo: z.string().nullable().optional().describe('Memo text for this line item.')
    })
    .describe('A line item of a reimbursement.');

const TraceIdSchema = z
    .object({
        descriptor: z.string().nullable().optional().describe('Human-readable description of the bank reference (e.g. Trace ID, IMAD number).'),
        trace_id: z.string().nullable().optional().describe('The bank-facing accountability reference for the reimbursement payment.')
    })
    .describe('Bank-facing accountability reference for a reimbursement payment.');

const ReimbursementSchema = z
    .object({
        id: z.string().describe('Unique identifier of the reimbursement.'),
        accounting_date: z.string().nullable().optional().describe('Date used for accounting purposes; falls back to the transaction date.'),
        accounting_field_selections: z
            .array(AccountingFieldSelectionSchema)
            .nullable()
            .optional()
            .describe('Accounting fields selected to code the reimbursement.'),
        approved_at: z.string().nullable().optional().describe('ISO8601 timestamp at which the reimbursement was approved.'),
        attendees: z.array(AttendeeSchema).nullable().optional().describe('List of attendees for the reimbursement.'),
        created_at: z.string().nullable().optional().describe('ISO8601 timestamp at which the reimbursement was created.'),
        direction: z.string().nullable().optional().describe('Direction of the reimbursement: BUSINESS_TO_USER or USER_TO_BUSINESS.'),
        distance: z.number().nullable().optional().describe('Distance of the reimbursement in miles, for mileage reimbursements.'),
        employee_id: z.string().nullable().optional().describe('Employee ID of the person who submitted the reimbursement.'),
        end_location: z.string().nullable().optional().describe('Ending location of the trip, for mileage reimbursements.'),
        entity_amount: ReimbursementAmountSchema.nullable()
            .optional()
            .describe('Amount the payor entity pays, in the entity settlement currency. Null when no amount is set yet.'),
        entity_id: z.string().nullable().optional().describe('Unique identifier of the associated business entity.'),
        fund_id: z.string().nullable().optional().describe('The fund to which the reimbursement is attributed, if any.'),
        funding_source: z.string().nullable().optional().describe('Funding classification (e.g. RAMP_FUNDED, PAID_OUTSIDE_RAMP, PENDING).'),
        line_items: z.array(LineItemSchema).nullable().optional().describe('Line items related to the reimbursement.'),
        memo: z.string().nullable().optional().describe('Reimbursement memo.'),
        merchant: z.string().nullable().optional().describe('Name of the merchant associated with the reimbursement.'),
        merchant_amount: ReimbursementAmountSchema.nullable()
            .optional()
            .describe('Amount originally submitted for the reimbursement, in the currency it was submitted in.'),
        merchant_id: z.string().nullable().optional().describe('Unique identifier of the merchant, when Ramp recognizes it.'),
        payee_amount: CurrencyAmountSchema.nullable().optional().describe('Amount and currency received by the payee.'),
        payment_batch_id: z.string().nullable().optional().describe('Unique identifier of the reimbursement payment batch, if any.'),
        payment_id: z.string().nullable().optional().describe('Unique identifier of the payment batch, once paid.'),
        payment_processed_at: z.string().nullable().optional().describe('ISO8601 timestamp of the reimbursement payment.'),
        receipts: z.array(z.string()).nullable().optional().describe('IDs of receipts attached to the reimbursement.'),
        spend_limit_id: z.string().nullable().optional().describe('Deprecated alias of fund_id; the fund the reimbursement is attributed to.'),
        start_location: z.string().nullable().optional().describe('Starting location of the trip, for mileage reimbursements.'),
        state: z.string().nullable().optional().describe('Current state of the reimbursement (e.g. PENDING, APPROVED, REIMBURSED, CANCELED).'),
        submitted_at: z.string().nullable().optional().describe('ISO8601 timestamp when the reimbursement was most recently submitted.'),
        sync_status: z.string().nullable().optional().describe('Current sync status to the accounting provider (e.g. SYNC_READY, SYNCED).'),
        synced_at: z.string().nullable().optional().describe('ISO8601 timestamp when the reimbursement was synced to accounting.'),
        trace_id: TraceIdSchema.nullable().optional().describe('Bank-facing accountability reference, when available.'),
        transaction_date: z.string().nullable().optional().describe('Date of the underlying transaction (YYYY-MM-DD).'),
        trip_id: z.string().nullable().optional().describe('Trip ID associated with the reimbursement, if any.'),
        type: z.string().nullable().optional().describe('Type of the reimbursement (e.g. OUT_OF_POCKET, MILEAGE, PER_DIEM, PAYBACK_FULL).'),
        updated_at: z.string().nullable().optional().describe('ISO8601 timestamp at which the reimbursement was last updated.'),
        user_email: z.string().nullable().optional().describe('Email of the person who submitted the reimbursement.'),
        user_full_name: z.string().nullable().optional().describe('Full name of the person who submitted the reimbursement.'),
        user_id: z.string().nullable().optional().describe('Ramp user ID of the person who submitted the reimbursement.'),
        waypoints: z.array(z.string()).nullable().optional().describe('Intermediate stops during the trip, for mileage reimbursements.')
    })
    .describe('A Ramp out-of-pocket or mileage reimbursement.');

const CheckpointSchema = z.object({
    updated_after: z.string().describe('Watermark used as the updated_after filter on the next run, with a small overlap buffer.')
});

const sync = createSync({
    description: 'Syncs out-of-pocket and mileage reimbursements, incrementally by last-updated time.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Reimbursement: ReimbursementSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;

        const proxyConfig: ProxyConfiguration = {
            // https://docs.ramp.com/developer-api/v1/reimbursements
            endpoint: '/developer/v1/reimbursements',
            params: {
                ...(updatedAfter ? { updated_after: updatedAfter } : {})
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'page.next',
                response_path: 'data',
                limit_name_in_request: 'page_size',
                limit: PAGE_SIZE
            },
            retries: 3
        };

        let maxUpdatedAtMs: number | undefined;

        for await (const batch of nango.paginate(proxyConfig)) {
            const reimbursements = z.array(ReimbursementSchema).parse(batch);

            if (reimbursements.length === 0) {
                continue;
            }

            await nango.batchSave(reimbursements, 'Reimbursement');

            for (const reimbursement of reimbursements) {
                if (reimbursement.updated_at == null) {
                    continue;
                }

                const updatedAtMs = Date.parse(reimbursement.updated_at);

                if (!Number.isNaN(updatedAtMs) && (maxUpdatedAtMs === undefined || updatedAtMs > maxUpdatedAtMs)) {
                    maxUpdatedAtMs = updatedAtMs;
                }
            }
        }

        if (maxUpdatedAtMs !== undefined) {
            await nango.saveCheckpoint({
                updated_after: new Date(maxUpdatedAtMs - OVERLAP_BUFFER_MS).toISOString()
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
