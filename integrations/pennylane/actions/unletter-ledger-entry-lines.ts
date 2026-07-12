import { z } from 'zod';
import { createAction } from 'nango';

const LedgerEntryLineInputSchema = z.object({
    id: z.number().describe('Id of the ledger entry line. Example: 123')
});

const InputSchema = z.object({
    unbalanced_lettering_strategy: z
        .enum(['none', 'partial'])
        .describe(
            "Strategy for handling potentially unbalanced lettering. 'none' rejects unbalanced lettering with an error. 'partial' creates a potentially unbalanced lettering."
        ),
    ledger_entry_lines: z.array(LedgerEntryLineInputSchema).min(1).describe('The list of ledger entry lines you want to unletter. Minimum 1 item.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Unletter ledger entry lines.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ledger_entries:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://pennylane.readme.io/reference/deleteledgerentrylinesunletter
        await nango.delete({
            endpoint: '/api/external/v2/ledger_entry_lines/lettering',
            data: {
                unbalanced_lettering_strategy: input.unbalanced_lettering_strategy,
                ledger_entry_lines: input.ledger_entry_lines.map((line) => ({
                    id: line.id
                }))
            },
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
