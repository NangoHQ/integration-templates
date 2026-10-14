import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        transaction_id: z.string().describe('Unique identifier of the transaction whose memo to retrieve. Example: "1e132a4f-392b-4e12-8f35-2788034a9ead"')
    })
    .describe('Identifier of the transaction to read the memo from.');

const ProviderMemoSchema = z.object({
    id: z.string(),
    memo: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the transaction the memo belongs to.'),
        memo: z.string().nullable().describe('Current memo text on the transaction, or null when the transaction has no memo set.')
    })
    .describe('The current memo text associated with a transaction.');

/**
 * @tags: [read]
 * @tagReason: Fetches the current memo text from the provider and does not modify any provider state.
 */
const action = createAction({
    description: 'Get the current memo text on a transaction.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/developer-api/v1/api/memos
            endpoint: `/developer/v1/memos/${encodeURIComponent(input.transaction_id)}`,
            retries: 3
        });

        const providerMemo = ProviderMemoSchema.parse(response.data);

        return {
            id: providerMemo.id,
            memo: providerMemo.memo ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
