import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        transaction_id: z.string().describe('Ramp transaction ID to set the memo on. Example: "1e132a4f-392b-4e12-8f35-2788034a9ead"'),
        memo: z
            .string()
            .max(255)
            .describe('Memo text to store on the transaction, up to 255 characters. Replaces any existing memo. Example: "Flight to Toronto"'),
        is_memo_recurring: z.boolean().optional().describe('Deprecated by Ramp. Whether the memo should automatically apply to similar future transactions.')
    })
    .describe('Identifies the transaction and the memo text to set on it.');

const ProviderMemoSchema = z.object({
    id: z.string(),
    memo: z.string().nullable()
});

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the transaction the memo was set on.'),
        memo: z.string().nullable().describe('Memo text now stored on the transaction, or null when the memo was cleared with an empty string.')
    })
    .describe('The transaction memo as persisted by Ramp after the update.');

/**
 * @tags: [write]
 * @tagReason: Creates or replaces the memo text stored on a provider transaction.
 * @pitfalls: Setting a memo replaces any existing text wholesale and the prior value cannot be read back afterward; sending an empty memo clears it and returns null.
 */
const action = createAction({
    description: 'Set or replace the memo text on a transaction.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['memos:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.ramp.com/developer-api/v1/overview/introduction -> Memo: POST /developer/v1/memos/{transaction_id}
            endpoint: `/developer/v1/memos/${encodeURIComponent(input.transaction_id)}`,
            data: {
                memo: input.memo,
                ...(input.is_memo_recurring !== undefined && { is_memo_recurring: input.is_memo_recurring })
            },
            // Setting a memo is an idempotent replace, so a retry rewrites the same value.
            retries: 3
        };

        const response = await nango.post(config);

        const memo = ProviderMemoSchema.parse(response.data);

        return {
            id: memo.id,
            memo: memo.memo
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
