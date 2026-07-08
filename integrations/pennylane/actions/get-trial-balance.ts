import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    period_start: z.string().describe('The start of the period you want the trial balance for. Example: "2026-01-01"'),
    period_end: z.string().describe('The end of the period you want the trial balance for. Example: "2026-12-31"'),
    is_auxiliary: z.boolean().optional().describe('Whether to include auxiliary accounts or not.')
});

const TrialBalanceItemSchema = z.object({
    number: z.string(),
    label: z.string(),
    debits: z.string(),
    credits: z.string(),
    formatted_number: z.string()
});

const OutputSchema = z.object({
    items: z.array(TrialBalanceItemSchema)
});

const ProviderResponseSchema = z.object({
    items: z.array(z.unknown()).optional(),
    next_cursor: z.string().nullable().optional(),
    has_more: z.boolean().nullable().optional()
});

const action = createAction({
    description: 'Retrieve the trial balance for a period.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['trial_balance:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const items: z.infer<typeof TrialBalanceItemSchema>[] = [];
        let cursor: string | undefined;

        do {
            // https://pennylane.readme.io/reference/gettrialbalance
            const response = await nango.get({
                endpoint: '/api/external/v2/trial_balance',
                params: {
                    period_start: input.period_start,
                    period_end: input.period_end,
                    ...(input.is_auxiliary !== undefined && { is_auxiliary: String(input.is_auxiliary) }),
                    ...(cursor && { cursor })
                },
                retries: 3
            });

            const parsed = ProviderResponseSchema.parse(response.data);
            const rawItems = parsed.items ?? [];
            items.push(...z.array(TrialBalanceItemSchema).parse(rawItems));

            const nextCursor = parsed.next_cursor;
            cursor = nextCursor != null && nextCursor.length > 0 ? nextCursor : undefined;
        } while (cursor);

        return {
            items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
