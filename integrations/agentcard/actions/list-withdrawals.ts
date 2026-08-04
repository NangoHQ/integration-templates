import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('The connected user\'s id. Example: "usr_123"')
});

const WithdrawalRecipientSchema = z.object({
    object: z.literal('withdrawal_recipient'),
    user_id: z.string(),
    id: z.string(),
    type: z.enum(['ach', 'international_wire']),
    nickname: z.string().nullable().optional(),
    beneficiary_name: z.string(),
    country_code: z.string(),
    currency: z.string().nullable().optional(),
    bank_name: z.string().nullable().optional(),
    account_number_last4: z.string().nullable().optional(),
    routing_number: z.string().nullable().optional(),
    account_type: z.enum(['checking', 'savings']).nullable().optional(),
    iban_last4: z.string().nullable().optional(),
    swift_code: z.string().nullable().optional(),
    created_at: z.string()
});

const WithdrawalSchema = z.object({
    object: z.literal('withdrawal'),
    id: z.string(),
    user_id: z.string(),
    status: z.enum(['requested', 'processing', 'completed', 'rejected']),
    rail: z.enum(['bank', 'address']),
    amount_cents: z.number(),
    destination_address: z.string().nullable().optional(),
    failure_code: z.string().nullable().optional(),
    completed_at: z.string().nullable().optional(),
    created_at: z.string(),
    recipient: WithdrawalRecipientSchema.nullable().optional()
});

const ListResponseSchema = z.object({
    object: z.literal('list'),
    data: z.array(WithdrawalSchema)
});

const OutputSchema = z.object({
    withdrawals: z.array(
        z.object({
            id: z.string(),
            user_id: z.string(),
            status: z.enum(['requested', 'processing', 'completed', 'rejected']),
            rail: z.enum(['bank', 'address']),
            amount_cents: z.number(),
            destination_address: z.string().optional(),
            failure_code: z.string().optional(),
            completed_at: z.string().optional(),
            created_at: z.string(),
            recipient: WithdrawalRecipientSchema.optional()
        })
    )
});

const action = createAction({
    description: "List a connected user's most recent withdrawals across every rail.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.agentcard.sh/api/v2/wallet/withdrawals
            endpoint: '/api/v2/wallet/withdrawals',
            params: {
                user_id: input.user_id
            },
            retries: 3
        });

        const parsed = ListResponseSchema.parse(response.data);

        return {
            withdrawals: parsed.data.map((withdrawal) => ({
                id: withdrawal.id,
                user_id: withdrawal.user_id,
                status: withdrawal.status,
                rail: withdrawal.rail,
                amount_cents: withdrawal.amount_cents,
                ...(withdrawal.destination_address != null && { destination_address: withdrawal.destination_address }),
                ...(withdrawal.failure_code != null && { failure_code: withdrawal.failure_code }),
                ...(withdrawal.completed_at != null && { completed_at: withdrawal.completed_at }),
                created_at: withdrawal.created_at,
                ...(withdrawal.recipient != null && { recipient: withdrawal.recipient })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
