import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        reimbursee_id: z.string().describe('Unique identifier of the user the reimbursement is paid to. Example: "3c90c3cc-0d44-4b50-8888-8dd25736052a"'),
        distance: z.number().describe('Distance travelled for the trip, expressed in the unit given by distance_units. Example: 12.5'),
        distance_units: z.enum(['MILES', 'KILOMETERS']).describe('Unit for distance. Must be exactly "MILES" or "KILOMETERS". Example: "MILES"'),
        trip_date: z.string().describe('Date of the trip in ISO 8601 date format (YYYY-MM-DD). Example: "2026-10-14"'),
        memo: z.string().optional().describe('Optional note describing the trip. Example: "Client visit"'),
        start_location: z.string().optional().describe('Optional starting location of the trip. Example: "123 Main St, Scranton, PA"'),
        end_location: z.string().optional().describe('Optional ending location of the trip. Example: "456 Business Ave, Philadelphia, PA"'),
        waypoints: z.array(z.string()).optional().describe('Optional ordered list of intermediate stops between the start and end locations.'),
        spend_allocation_id: z.string().optional().describe('Optional identifier of the fund to attribute the mileage reimbursement to.')
    })
    .describe('Input for creating a mileage reimbursement');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the created reimbursement.'),
        type: z.string().describe('Reimbursement type. Always "MILEAGE" for this action.'),
        state: z.string().describe('Current lifecycle state of the reimbursement. Example: "PENDING"'),
        amount: z
            .number()
            .optional()
            .describe('Reimbursement amount in major currency units, computed by Ramp from the distance and its mileage rate. Example: 1.52'),
        currency: z.string().optional().describe('ISO 4217 currency code of amount. Example: "USD"'),
        distance: z.number().optional().describe('Trip distance recorded by Ramp.'),
        direction: z.string().describe('Direction of the reimbursement. Example: "BUSINESS_TO_USER"'),
        sync_status: z.string().describe('Accounting sync status of the reimbursement. Example: "NOT_SYNC_READY"'),
        user_id: z.string().describe('Identifier of the reimbursed user.'),
        user_email: z.string().describe('Email of the reimbursed user.'),
        user_full_name: z.string().describe('Full name of the reimbursed user.'),
        entity_id: z.string().optional().describe('Identifier of the business entity the reimbursement belongs to.'),
        fund_id: z.string().optional().describe('Identifier of the fund the reimbursement is attributed to, when set.'),
        memo: z.string().optional().describe('Memo attached to the reimbursement, when set.'),
        start_location: z.string().optional().describe('Starting location of the trip, when set.'),
        end_location: z.string().optional().describe('Ending location of the trip, when set.'),
        waypoints: z.array(z.string()).describe('Intermediate stop locations of the trip.'),
        receipts: z.array(z.string()).describe('Identifiers of receipts attached to the reimbursement.'),
        accounting_date: z.string().optional().describe('Date used for accounting purposes, when set.'),
        created_at: z.string().describe('ISO 8601 timestamp when the reimbursement was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the reimbursement was last updated.'),
        submitted_at: z.string().optional().describe('ISO 8601 timestamp when the reimbursement was submitted.'),
        approved_at: z.string().optional().describe('ISO 8601 timestamp when the reimbursement was approved.'),
        payment_processed_at: z.string().optional().describe('ISO 8601 timestamp when the reimbursement was paid.'),
        transaction_date: z.string().optional().describe('Date of the underlying trip transaction.')
    })
    .describe('Output of a created mileage reimbursement');

const ProviderReimbursementSchema = z.object({
    id: z.string(),
    type: z.string(),
    state: z.string(),
    amount: z.number().nullable().optional(),
    currency: z.string().nullable().optional(),
    distance: z.number().nullable(),
    direction: z.string(),
    sync_status: z.string(),
    user_id: z.string(),
    user_email: z.string(),
    user_full_name: z.string(),
    entity_id: z.string().nullable(),
    fund_id: z.string().nullable(),
    memo: z.string().nullable(),
    start_location: z.string().nullable(),
    end_location: z.string().nullable(),
    waypoints: z.array(z.string()),
    receipts: z.array(z.string()),
    accounting_date: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string().nullable(),
    submitted_at: z.string().nullable(),
    approved_at: z.string().nullable(),
    payment_processed_at: z.string().nullable(),
    transaction_date: z.string().nullable()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new mileage reimbursement on the provider.
 * @pitfalls: The reimbursement cannot be canceled or deleted once created, and its amount is computed by Ramp from the trip distance and its mileage rate rather than supplied by the caller, so the chosen distance_units directly changes the payout.
 */
const action = createAction({
    description: 'Create a mileage reimbursement for a user business trip.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['reimbursements:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            reimbursee_id: input.reimbursee_id,
            distance: input.distance,
            distance_units: input.distance_units,
            trip_date: input.trip_date,
            ...(input.memo !== undefined && { memo: input.memo }),
            ...(input.start_location !== undefined && { start_location: input.start_location }),
            ...(input.end_location !== undefined && { end_location: input.end_location }),
            ...(input.waypoints !== undefined && { waypoints: input.waypoints }),
            ...(input.spend_allocation_id !== undefined && { spend_allocation_id: input.spend_allocation_id })
        };

        // https://docs.ramp.com/developer-api/v1/api-reference/reimbursements
        const response = await nango.post<unknown>({
            endpoint: '/developer/v1/reimbursements/mileage',
            data: body,
            // A retry after a lost response would create a duplicate reimbursement, and reimbursements cannot be canceled or deleted.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- retries must be 0 for this non-idempotent create.
            retries: 0
        });

        const reimbursement = ProviderReimbursementSchema.parse(response.data);

        return {
            id: reimbursement.id,
            type: reimbursement.type,
            state: reimbursement.state,
            ...(reimbursement.amount != null && { amount: reimbursement.amount }),
            ...(reimbursement.currency != null && { currency: reimbursement.currency }),
            ...(reimbursement.distance != null && { distance: reimbursement.distance }),
            direction: reimbursement.direction,
            sync_status: reimbursement.sync_status,
            user_id: reimbursement.user_id,
            user_email: reimbursement.user_email,
            user_full_name: reimbursement.user_full_name,
            ...(reimbursement.entity_id != null && { entity_id: reimbursement.entity_id }),
            ...(reimbursement.fund_id != null && { fund_id: reimbursement.fund_id }),
            ...(reimbursement.memo != null && { memo: reimbursement.memo }),
            ...(reimbursement.start_location != null && { start_location: reimbursement.start_location }),
            ...(reimbursement.end_location != null && { end_location: reimbursement.end_location }),
            waypoints: reimbursement.waypoints,
            receipts: reimbursement.receipts,
            ...(reimbursement.accounting_date != null && { accounting_date: reimbursement.accounting_date }),
            created_at: reimbursement.created_at,
            ...(reimbursement.updated_at != null && { updated_at: reimbursement.updated_at }),
            ...(reimbursement.submitted_at != null && { submitted_at: reimbursement.submitted_at }),
            ...(reimbursement.approved_at != null && { approved_at: reimbursement.approved_at }),
            ...(reimbursement.payment_processed_at != null && { payment_processed_at: reimbursement.payment_processed_at }),
            ...(reimbursement.transaction_date != null && { transaction_date: reimbursement.transaction_date })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
