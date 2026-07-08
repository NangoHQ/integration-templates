import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    unbalanced_lettering_strategy: z
        .enum(['none', 'partial'])
        .describe('Strategy for handling unbalanced lettering. none: reject unbalanced lettering. partial: allow potentially unbalanced lettering.'),
    ledger_entry_lines: z
        .array(
            z.object({
                id: z.number().describe('ID of the ledger entry line. Example: 14048452796416')
            })
        )
        .min(2)
        .describe('List of ledger entry lines to letter together. Must contain at least 2 items.')
});

const LetteredLedgerEntryLineSchema = z.object({
    id: z.number()
});

const OutputSchema = z.object({
    ledger_entry_lines: z.array(LetteredLedgerEntryLineSchema)
});

const action = createAction({
    description: 'Letter ledger entry lines together',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ledger_entries:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://pennylane.readme.io/reference/postledgerentrylinesletter
        const response = await nango.post({
            endpoint: '/api/external/v2/ledger_entry_lines/lettering',
            data: {
                unbalanced_lettering_strategy: input.unbalanced_lettering_strategy,
                ledger_entry_lines: input.ledger_entry_lines
            },
            retries: 1
        });

        const parsed = z.array(LetteredLedgerEntryLineSchema).parse(response.data);

        return {
            ledger_entry_lines: parsed
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
