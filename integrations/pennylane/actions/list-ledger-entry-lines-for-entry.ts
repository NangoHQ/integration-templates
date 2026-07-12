import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ledger_entry_id: z.number().describe('Existing Ledger Entry ID. Example: 42'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20.')
});

const ProviderLedgerAccountSchema = z.object({
    id: z.number(),
    number: z.string(),
    url: z.string()
});

const ProviderLedgerEntryLineSchema = z.object({
    id: z.number(),
    debit: z.string(),
    credit: z.string(),
    label: z.string(),
    ledger_account_id: z.number().optional(),
    ledger_account: ProviderLedgerAccountSchema
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderLedgerEntryLineSchema),
    has_more: z.boolean().nullable(),
    next_cursor: z.string().nullable()
});

const OutputSchema = z.object({
    items: z.array(ProviderLedgerEntryLineSchema),
    has_more: z.boolean().optional().nullable(),
    next_cursor: z.string().optional().nullable()
});

const action = createAction({
    description: 'List ledger entry lines of a ledger entry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ledger_entries:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getledgerentriesledgerentrylines
            endpoint: `/api/external/v2/ledger_entries/${encodeURIComponent(String(input.ledger_entry_id))}/ledger_entry_lines`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items,
            ...(providerResponse.has_more !== null && { has_more: providerResponse.has_more }),
            ...(providerResponse.next_cursor !== null && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
