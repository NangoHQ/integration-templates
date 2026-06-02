import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    refund_id: z.string().describe('The ID of the refund to retrieve. Example: "re_3TbSqaEZpD6kXrae0EGbSIG6"')
});

const ProviderRefundSchema = z
    .object({
        id: z.string(),
        object: z.string().optional(),
        amount: z.number(),
        balance_transaction: z.string().nullable().optional(),
        charge: z.string().nullable().optional(),
        created: z.number(),
        currency: z.string(),
        description: z.string().nullable().optional(),
        destination_details: z.record(z.string(), z.unknown()).nullable().optional(),
        failure_balance_transaction: z.string().nullable().optional(),
        failure_reason: z.string().nullable().optional(),
        instructions_email: z.string().nullable().optional(),
        metadata: z.record(z.string(), z.unknown()).nullable().optional(),
        next_action: z.record(z.string(), z.unknown()).nullable().optional(),
        payment_intent: z.string().nullable().optional(),
        pending_reason: z.string().nullable().optional(),
        reason: z.string().nullable().optional(),
        receipt_number: z.string().nullable().optional(),
        source_transfer_reversal: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        transfer_reversal: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    object: z.string().optional(),
    amount: z.number(),
    balance_transaction: z.string().nullable().optional(),
    charge: z.string().nullable().optional(),
    created: z.number(),
    currency: z.string(),
    description: z.string().nullable().optional(),
    destination_details: z.record(z.string(), z.unknown()).nullable().optional(),
    failure_balance_transaction: z.string().nullable().optional(),
    failure_reason: z.string().nullable().optional(),
    instructions_email: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    next_action: z.record(z.string(), z.unknown()).nullable().optional(),
    payment_intent: z.string().nullable().optional(),
    pending_reason: z.string().nullable().optional(),
    reason: z.string().nullable().optional(),
    receipt_number: z.string().nullable().optional(),
    source_transfer_reversal: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    transfer_reversal: z.string().nullable().optional()
});

const action = createAction({
    description: 'Retrieve a single refund from Stripe.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-refund',
        group: 'Refunds'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.stripe.com/api/refunds/retrieve
            endpoint: `/v1/refunds/${encodeURIComponent(input.refund_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Refund not found',
                refund_id: input.refund_id
            });
        }

        const refund = ProviderRefundSchema.parse(response.data);

        return {
            id: refund.id,
            ...(refund.object !== undefined && { object: refund.object }),
            amount: refund.amount,
            ...(refund.balance_transaction !== undefined && { balance_transaction: refund.balance_transaction }),
            ...(refund.charge !== undefined && { charge: refund.charge }),
            created: refund.created,
            currency: refund.currency,
            ...(refund.description !== undefined && { description: refund.description }),
            ...(refund.destination_details !== undefined && { destination_details: refund.destination_details }),
            ...(refund.failure_balance_transaction !== undefined && { failure_balance_transaction: refund.failure_balance_transaction }),
            ...(refund.failure_reason !== undefined && { failure_reason: refund.failure_reason }),
            ...(refund.instructions_email !== undefined && { instructions_email: refund.instructions_email }),
            ...(refund.metadata !== undefined && { metadata: refund.metadata }),
            ...(refund.next_action !== undefined && { next_action: refund.next_action }),
            ...(refund.payment_intent !== undefined && { payment_intent: refund.payment_intent }),
            ...(refund.pending_reason !== undefined && { pending_reason: refund.pending_reason }),
            ...(refund.reason !== undefined && { reason: refund.reason }),
            ...(refund.receipt_number !== undefined && { receipt_number: refund.receipt_number }),
            ...(refund.source_transfer_reversal !== undefined && { source_transfer_reversal: refund.source_transfer_reversal }),
            ...(refund.status !== undefined && { status: refund.status }),
            ...(refund.transfer_reversal !== undefined && { transfer_reversal: refund.transfer_reversal })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
