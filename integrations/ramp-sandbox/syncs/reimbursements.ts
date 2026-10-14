import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OVERLAP_BUFFER_MS = 2 * 60 * 1000;
const PAGE_SIZE = 100;

// Provider schemas mirror the Ramp Reimbursement object (kept consistent with actions/list-reimbursements.ts): spec-nullable
// fields are .nullable(); fields outside the published required list (legacy amounts, trace_id, expense_group, ...) can be
// absent or null, so they use .nullish(). Enumerated values stay plain strings so a new Ramp value cannot abort the sync.
const ProviderCurrencyAmountSchema = z.object({
    amount: z.number(),
    currency_code: z.string(),
    minor_unit_conversion_rate: z.number().nullish()
});

const ProviderReimbursementAmountSchema = z.object({
    currency: z.string(),
    value: z.number(),
    minor_unit_conversion_rate: z.number().nullish()
});

const ProviderAccountingFieldSelectionSchema = z.object({
    id: z.string().nullish(),
    external_id: z.string().nullish(),
    external_code: z.string().nullish(),
    name: z.string().nullish(),
    display_name: z.string().nullish(),
    provider_name: z.string().nullish(),
    type: z.string().nullish(),
    source: z.object({ type: z.string() }).nullish(),
    category_info: z
        .object({
            id: z.string().nullish(),
            external_id: z.string().nullish(),
            name: z.string().nullish(),
            type: z.string().nullish()
        })
        .nullish()
});

const ProviderReimbursementSchema = z.object({
    id: z.string(),
    state: z.string(),
    type: z.string(),
    direction: z.string(),
    sync_status: z.string(),
    funding_source: z.string().nullish(),
    user_id: z.string(),
    user_email: z.string(),
    user_full_name: z.string(),
    employee_id: z.string().nullable(),
    entity_id: z.string().nullable(),
    fund_id: z.string().nullable(),
    spend_limit_id: z.string().nullable(),
    trip_id: z.string().nullable(),
    merchant: z.string().nullable(),
    merchant_id: z.string().nullable(),
    memo: z.string().nullable(),
    amount: z.number().nullish(),
    currency: z.string().nullish(),
    original_reimbursement_amount: ProviderCurrencyAmountSchema.nullish(),
    payee_amount: ProviderCurrencyAmountSchema.nullable(),
    entity_amount: ProviderReimbursementAmountSchema.nullable(),
    merchant_amount: ProviderReimbursementAmountSchema.nullable(),
    accounting_date: z.string().nullable(),
    approved_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string().nullable(),
    submitted_at: z.string().nullable(),
    synced_at: z.string().nullable(),
    payment_processed_at: z.string().nullable(),
    transaction_date: z.string().nullable(),
    distance: z.number().nullable(),
    start_location: z.string().nullable(),
    end_location: z.string().nullable(),
    // The spec declares waypoints as a non-null array, but live responses return null for non-mileage reimbursements.
    waypoints: z.array(z.string()).nullable(),
    attendees: z.array(
        z.object({
            name: z.string(),
            user_id: z.string().nullable()
        })
    ),
    line_items: z.array(
        z.object({
            amount: ProviderCurrencyAmountSchema.nullable(),
            memo: z.string().nullable(),
            accounting_field_selections: z.array(ProviderAccountingFieldSelectionSchema)
        })
    ),
    receipts: z.array(z.string()),
    accounting_field_selections: z.array(ProviderAccountingFieldSelectionSchema),
    payment_batch_id: z.string().nullable(),
    payment_id: z.string().nullable(),
    posting_gl_account: z.string().nullish(),
    repayment_transaction_id: z.string().nullish(),
    trace_id: z
        .object({
            descriptor: z.string().nullable(),
            trace_id: z.string().nullable()
        })
        .nullish(),
    expense_group: z
        .object({
            id: z.string().nullish(),
            name: z.string().nullish()
        })
        .nullish()
});

type ProviderReimbursement = z.infer<typeof ProviderReimbursementSchema>;

const CurrencyAmountSchema = z
    .object({
        amount: z.number().describe('The amount of money in the smallest denomination of the currency (e.g. cents for USD).'),
        currency_code: z.string().describe('The currency, in ISO 4217 format (e.g. USD).'),
        minor_unit_conversion_rate: z.number().optional().describe('Conversion factor from the integer amount to the actual currency value (e.g. 100 for USD).')
    })
    .describe('A monetary amount with its currency code.');

const ReimbursementAmountSchema = z
    .object({
        currency: z.string().describe('The currency of the amount in ISO 4217 format (e.g. USD).'),
        value: z.number().describe('The amount in the smallest denomination of the currency (e.g. cents for USD).'),
        minor_unit_conversion_rate: z.number().optional().describe('Conversion factor from the integer value to the actual currency amount (e.g. 100 for USD).')
    })
    .describe('A monetary amount expressed in a specific currency.');

const AccountingFieldSelectionSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier for this option within Ramp.'),
        external_id: z.string().optional().describe('External ID that uniquely identifies this option in the ERP.'),
        external_code: z.string().optional().describe('External code displayed in the ERP for this option.'),
        name: z.string().optional().describe('Name of the accounting field option.'),
        display_name: z.string().optional().describe('Customer-set display name for the accounting field option in Ramp.'),
        provider_name: z.string().optional().describe('Name of the accounting field provider.'),
        type: z.string().optional().describe('Type of accounting field (e.g. GL_ACCOUNT, SUBSIDIARY, COST_CENTER).'),
        source: z
            .object({
                type: z.string().describe('Describes the type of source that added this accounting coding selection.')
            })
            .optional()
            .describe('Source of this accounting coding selection.'),
        category_info: z
            .object({
                id: z.string().optional().describe('Unique identifier for this accounting field within Ramp.'),
                external_id: z.string().optional().describe('External ID that uniquely identifies this accounting field in the ERP.'),
                name: z.string().optional().describe('Name of the accounting field.'),
                type: z.string().optional().describe('Type of accounting field (e.g. GL_ACCOUNT, SUBSIDIARY, COST_CENTER).')
            })
            .optional()
            .describe('Information about the parent accounting category.')
    })
    .describe('An accounting field selected to code a reimbursement.');

const ReimbursementSchema = z
    .object({
        id: z.string().describe('Unique identifier of the reimbursement.'),
        state: z.string().describe('Current state of the reimbursement (e.g. PENDING, APPROVED, REIMBURSED, CANCELED, DELETED).'),
        type: z.string().describe('Type of the reimbursement (e.g. OUT_OF_POCKET, MILEAGE, PER_DIEM, PAYBACK_FULL, PAYBACK_PARTIAL).'),
        direction: z.string().describe('Direction of the reimbursement: BUSINESS_TO_USER, or USER_TO_BUSINESS for repayments.'),
        sync_status: z.string().describe('Current sync status to the accounting provider (e.g. NOT_SYNC_READY, SYNC_READY, SYNCED).'),
        funding_source: z.string().optional().describe('Funding classification (e.g. RAMP_FUNDED, PAID_OUTSIDE_RAMP, PENDING), when Ramp can determine it.'),
        user_id: z.string().describe('Ramp user ID of the person who submitted the reimbursement.'),
        user_email: z.string().describe('Email of the person who submitted the reimbursement.'),
        user_full_name: z.string().describe('Full name of the person who submitted the reimbursement.'),
        employee_id: z.string().optional().describe('Employee ID of the person who submitted the reimbursement.'),
        entity_id: z.string().optional().describe('Unique identifier of the associated business entity.'),
        fund_id: z.string().optional().describe('The fund to which the reimbursement is attributed, if any.'),
        spend_limit_id: z.string().optional().describe('Deprecated alias of fund_id; the fund the reimbursement is attributed to.'),
        trip_id: z.string().optional().describe('Trip ID associated with the reimbursement, if any.'),
        merchant: z.string().optional().describe('Name of the merchant associated with the reimbursement.'),
        merchant_id: z.string().optional().describe('Unique identifier of the merchant, when Ramp recognizes it.'),
        memo: z.string().optional().describe('Reimbursement memo.'),
        amount: z.number().optional().describe('Legacy reimbursement amount in major currency units (e.g. 12.34). Prefer entity_amount.'),
        currency: z.string().optional().describe('Legacy ISO 4217 currency code of the reimbursement. Prefer entity_amount.currency.'),
        original_reimbursement_amount: CurrencyAmountSchema.optional().describe('Legacy amount originally submitted for the reimbursement. Prefer merchant_amount.'),
        payee_amount: CurrencyAmountSchema.optional().describe('Amount and currency received by the payee.'),
        entity_amount: ReimbursementAmountSchema.optional().describe('Amount the payor entity pays, in the entity settlement currency.'),
        merchant_amount: ReimbursementAmountSchema.optional().describe('Amount originally submitted for the reimbursement, in the currency it was submitted in.'),
        accounting_date: z.string().optional().describe('Date used for accounting purposes; falls back to the transaction date.'),
        approved_at: z.string().optional().describe('ISO8601 timestamp at which the reimbursement was approved.'),
        created_at: z.string().describe('ISO8601 timestamp at which the reimbursement was created.'),
        updated_at: z.string().optional().describe('ISO8601 timestamp at which the reimbursement was last updated.'),
        submitted_at: z.string().optional().describe('ISO8601 timestamp when the reimbursement was most recently submitted.'),
        synced_at: z.string().optional().describe('ISO8601 timestamp when the reimbursement was synced to accounting.'),
        payment_processed_at: z.string().optional().describe('ISO8601 timestamp of the reimbursement payment.'),
        transaction_date: z.string().optional().describe('Date of the underlying transaction (YYYY-MM-DD).'),
        distance: z.number().optional().describe('Distance of the reimbursement in miles, for mileage reimbursements.'),
        start_location: z.string().optional().describe('Starting location of the trip, for mileage reimbursements.'),
        end_location: z.string().optional().describe('Ending location of the trip, for mileage reimbursements.'),
        waypoints: z.array(z.string()).optional().describe('Intermediate stops during the trip, for mileage reimbursements.'),
        attendees: z
            .array(
                z
                    .object({
                        name: z.string().describe('Full name of the attendee.'),
                        user_id: z.string().optional().describe('Ramp user ID of the attendee, if the attendee is linked to a Ramp user.')
                    })
                    .describe('A person attending a reimbursement.')
            )
            .describe('List of attendees for the reimbursement.'),
        line_items: z
            .array(
                z
                    .object({
                        amount: CurrencyAmountSchema.optional().describe('Amount of the line item.'),
                        memo: z.string().optional().describe('Memo text for this line item.'),
                        accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting field selections used to code this line item.')
                    })
                    .describe('A line item of a reimbursement.')
            )
            .describe('Line items related to the reimbursement.'),
        receipts: z.array(z.string()).describe('IDs of receipts attached to the reimbursement.'),
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting fields selected to code the reimbursement.'),
        payment_batch_id: z.string().optional().describe('Unique identifier of the reimbursement payment batch, if any.'),
        payment_id: z.string().optional().describe('Unique identifier of the payment batch, once paid.'),
        posting_gl_account: z.string().optional().describe('GL account used when posting the reimbursement to the ERP, if any.'),
        repayment_transaction_id: z.string().optional().describe('Identifier of the repayment transaction, for USER_TO_BUSINESS repayments.'),
        trace_id: z
            .object({
                descriptor: z.string().optional().describe('Human-readable description of the bank reference (e.g. Trace ID, IMAD number).'),
                trace_id: z.string().optional().describe('The bank-facing accountability reference for the reimbursement payment.')
            })
            .optional()
            .describe('Bank-facing accountability reference, when available.'),
        expense_group: z
            .object({
                id: z.string().optional().describe('Unique identifier of the expense group.'),
                name: z.string().optional().describe('Name of the expense group.')
            })
            .optional()
            .describe('Expense group the reimbursement belongs to, when assigned.')
    })
    .describe('A Ramp out-of-pocket, mileage or per-diem reimbursement, or a user-to-business repayment.');

type Reimbursement = z.infer<typeof ReimbursementSchema>;

function mapCurrencyAmount(amount: z.infer<typeof ProviderCurrencyAmountSchema>): z.infer<typeof CurrencyAmountSchema> {
    return {
        amount: amount.amount,
        currency_code: amount.currency_code,
        ...(amount.minor_unit_conversion_rate != null && { minor_unit_conversion_rate: amount.minor_unit_conversion_rate })
    };
}

function mapReimbursementAmount(amount: z.infer<typeof ProviderReimbursementAmountSchema>): z.infer<typeof ReimbursementAmountSchema> {
    return {
        currency: amount.currency,
        value: amount.value,
        ...(amount.minor_unit_conversion_rate != null && { minor_unit_conversion_rate: amount.minor_unit_conversion_rate })
    };
}

function mapAccountingFieldSelection(selection: z.infer<typeof ProviderAccountingFieldSelectionSchema>): z.infer<typeof AccountingFieldSelectionSchema> {
    const categoryInfo = selection.category_info;

    return {
        ...(selection.id != null && { id: selection.id }),
        ...(selection.external_id != null && { external_id: selection.external_id }),
        ...(selection.external_code != null && { external_code: selection.external_code }),
        ...(selection.name != null && { name: selection.name }),
        ...(selection.display_name != null && { display_name: selection.display_name }),
        ...(selection.provider_name != null && { provider_name: selection.provider_name }),
        ...(selection.type != null && { type: selection.type }),
        ...(selection.source != null && { source: { type: selection.source.type } }),
        ...(categoryInfo != null && {
            category_info: {
                ...(categoryInfo.id != null && { id: categoryInfo.id }),
                ...(categoryInfo.external_id != null && { external_id: categoryInfo.external_id }),
                ...(categoryInfo.name != null && { name: categoryInfo.name }),
                ...(categoryInfo.type != null && { type: categoryInfo.type })
            }
        })
    };
}

function mapReimbursement(reimbursement: ProviderReimbursement): Reimbursement {
    const traceId = reimbursement.trace_id;
    const expenseGroup = reimbursement.expense_group;

    return {
        id: reimbursement.id,
        state: reimbursement.state,
        type: reimbursement.type,
        direction: reimbursement.direction,
        sync_status: reimbursement.sync_status,
        ...(reimbursement.funding_source != null && { funding_source: reimbursement.funding_source }),
        user_id: reimbursement.user_id,
        user_email: reimbursement.user_email,
        user_full_name: reimbursement.user_full_name,
        ...(reimbursement.employee_id != null && { employee_id: reimbursement.employee_id }),
        ...(reimbursement.entity_id != null && { entity_id: reimbursement.entity_id }),
        ...(reimbursement.fund_id != null && { fund_id: reimbursement.fund_id }),
        ...(reimbursement.spend_limit_id != null && { spend_limit_id: reimbursement.spend_limit_id }),
        ...(reimbursement.trip_id != null && { trip_id: reimbursement.trip_id }),
        ...(reimbursement.merchant != null && { merchant: reimbursement.merchant }),
        ...(reimbursement.merchant_id != null && { merchant_id: reimbursement.merchant_id }),
        ...(reimbursement.memo != null && { memo: reimbursement.memo }),
        ...(reimbursement.amount != null && { amount: reimbursement.amount }),
        ...(reimbursement.currency != null && { currency: reimbursement.currency }),
        ...(reimbursement.original_reimbursement_amount != null && {
            original_reimbursement_amount: mapCurrencyAmount(reimbursement.original_reimbursement_amount)
        }),
        ...(reimbursement.payee_amount != null && { payee_amount: mapCurrencyAmount(reimbursement.payee_amount) }),
        ...(reimbursement.entity_amount != null && { entity_amount: mapReimbursementAmount(reimbursement.entity_amount) }),
        ...(reimbursement.merchant_amount != null && { merchant_amount: mapReimbursementAmount(reimbursement.merchant_amount) }),
        ...(reimbursement.accounting_date != null && { accounting_date: reimbursement.accounting_date }),
        ...(reimbursement.approved_at != null && { approved_at: reimbursement.approved_at }),
        created_at: reimbursement.created_at,
        ...(reimbursement.updated_at != null && { updated_at: reimbursement.updated_at }),
        ...(reimbursement.submitted_at != null && { submitted_at: reimbursement.submitted_at }),
        ...(reimbursement.synced_at != null && { synced_at: reimbursement.synced_at }),
        ...(reimbursement.payment_processed_at != null && { payment_processed_at: reimbursement.payment_processed_at }),
        ...(reimbursement.transaction_date != null && { transaction_date: reimbursement.transaction_date }),
        ...(reimbursement.distance != null && { distance: reimbursement.distance }),
        ...(reimbursement.start_location != null && { start_location: reimbursement.start_location }),
        ...(reimbursement.end_location != null && { end_location: reimbursement.end_location }),
        ...(reimbursement.waypoints != null && { waypoints: reimbursement.waypoints }),
        attendees: reimbursement.attendees.map((attendee) => ({
            name: attendee.name,
            ...(attendee.user_id != null && { user_id: attendee.user_id })
        })),
        line_items: reimbursement.line_items.map((lineItem) => ({
            ...(lineItem.amount != null && { amount: mapCurrencyAmount(lineItem.amount) }),
            ...(lineItem.memo != null && { memo: lineItem.memo }),
            accounting_field_selections: lineItem.accounting_field_selections.map(mapAccountingFieldSelection)
        })),
        receipts: reimbursement.receipts,
        accounting_field_selections: reimbursement.accounting_field_selections.map(mapAccountingFieldSelection),
        ...(reimbursement.payment_batch_id != null && { payment_batch_id: reimbursement.payment_batch_id }),
        ...(reimbursement.payment_id != null && { payment_id: reimbursement.payment_id }),
        ...(reimbursement.posting_gl_account != null && { posting_gl_account: reimbursement.posting_gl_account }),
        ...(reimbursement.repayment_transaction_id != null && { repayment_transaction_id: reimbursement.repayment_transaction_id }),
        ...(traceId != null && {
            trace_id: {
                ...(traceId.descriptor != null && { descriptor: traceId.descriptor }),
                ...(traceId.trace_id != null && { trace_id: traceId.trace_id })
            }
        }),
        ...(expenseGroup != null && {
            expense_group: {
                ...(expenseGroup.id != null && { id: expenseGroup.id }),
                ...(expenseGroup.name != null && { name: expenseGroup.name })
            }
        })
    };
}

// GET /developer/v1/reimbursements only returns BUSINESS_TO_USER reimbursements unless `direction`
// is set, so each run walks both directions in turn to also pick up USER_TO_BUSINESS repayments.
const DirectionSchema = z.enum(['BUSINESS_TO_USER', 'USER_TO_BUSINESS']);
const DIRECTIONS = DirectionSchema.options;
type Direction = z.infer<typeof DirectionSchema>;

const CheckpointSchema = z.object({
    updated_after: z.string().describe('Watermark used as the updated_after filter on the next run, with a small overlap buffer.'),
    direction: z
        .string()
        .describe('Direction (BUSINESS_TO_USER or USER_TO_BUSINESS) being scanned by an interrupted run, or an empty string when no scan is in progress.'),
    start: z.string().describe('Ramp pagination cursor within the in-progress direction, or an empty string to start that direction from its first page.'),
    max_updated_at: z.string().describe('Highest updated_at seen so far by an interrupted run, or an empty string when none has been seen.')
});

const sync = createSync({
    description: 'Syncs out-of-pocket and mileage reimbursements and user repayments, incrementally by last-updated time.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['reimbursements:read'],
    checkpoint: CheckpointSchema,
    models: {
        Reimbursement: ReimbursementSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        // Keep the same updated_after filter for every direction and for a resumed run, and only
        // advance it once both directions have been fully walked.
        const updatedAfter = checkpoint?.updated_after || undefined;
        const parsedDirection = DirectionSchema.safeParse(checkpoint?.direction);
        const resumeDirection = parsedDirection.success ? parsedDirection.data : undefined;
        const resumeStart = resumeDirection !== undefined ? checkpoint?.start || undefined : undefined;

        const resumedMaxMs = resumeDirection !== undefined && checkpoint?.max_updated_at ? Date.parse(checkpoint.max_updated_at) : Number.NaN;
        let maxUpdatedAtMs: number | undefined = Number.isNaN(resumedMaxMs) ? undefined : resumedMaxMs;

        const saveProgress = async (direction: Direction, start: string | undefined) => {
            await nango.saveCheckpoint({
                updated_after: updatedAfter ?? '',
                direction,
                start: start ?? '',
                max_updated_at: maxUpdatedAtMs !== undefined ? new Date(maxUpdatedAtMs).toISOString() : ''
            });
        };

        const firstDirectionIndex = resumeDirection !== undefined ? DIRECTIONS.indexOf(resumeDirection) : 0;

        for (let index = firstDirectionIndex; index < DIRECTIONS.length; index++) {
            const direction = DIRECTIONS[index];
            if (direction === undefined) {
                continue;
            }

            let start = direction === resumeDirection ? resumeStart : undefined;

            const proxyConfig: ProxyConfiguration = {
                // https://docs.ramp.com/developer-api/v1/reimbursements
                endpoint: '/developer/v1/reimbursements',
                params: {
                    direction,
                    ...(updatedAfter ? { updated_after: updatedAfter } : {}),
                    ...(start !== undefined ? { start } : {})
                },
                paginate: {
                    type: 'link',
                    link_path_in_response_body: 'page.next',
                    response_path: 'data',
                    limit_name_in_request: 'page_size',
                    limit: PAGE_SIZE,
                    on_page: async ({ nextPageParam }) => {
                        start =
                            typeof nextPageParam === 'string'
                                ? (new URL(nextPageParam, 'https://ramp.invalid').searchParams.get('start') ?? undefined)
                                : undefined;
                    }
                },
                retries: 3
            };

            for await (const batch of nango.paginate<unknown>(proxyConfig)) {
                const reimbursements = z.array(ProviderReimbursementSchema).parse(batch).map(mapReimbursement);

                if (reimbursements.length === 0) {
                    continue;
                }

                await nango.batchSave(reimbursements, 'Reimbursement');

                for (const reimbursement of reimbursements) {
                    if (reimbursement.updated_at === undefined) {
                        continue;
                    }

                    const updatedAtMs = Date.parse(reimbursement.updated_at);

                    if (!Number.isNaN(updatedAtMs) && (maxUpdatedAtMs === undefined || updatedAtMs > maxUpdatedAtMs)) {
                        maxUpdatedAtMs = updatedAtMs;
                    }
                }

                if (start !== undefined) {
                    await saveProgress(direction, start);
                }
            }

            const nextDirection = DIRECTIONS[index + 1];
            if (nextDirection !== undefined) {
                await saveProgress(nextDirection, undefined);
            }
        }

        await nango.saveCheckpoint({
            updated_after: maxUpdatedAtMs !== undefined ? new Date(maxUpdatedAtMs - OVERLAP_BUFFER_MS).toISOString() : (updatedAfter ?? ''),
            direction: '',
            start: '',
            max_updated_at: ''
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
