import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ledger_entry_line_id: z.number().describe('Ledger entry line ID. Example: 42'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 100.'),
    sort: z.string().optional().describe('Sort order. Prefix with `-` for descending. Available fields: `id`, `date`. Example: `-id`.')
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    label: z.string(),
    weight: z.string(),
    category_group: z.object({
        id: z.number()
    }),
    analytical_code: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderLedgerAccountSchema = z.object({
    id: z.number(),
    number: z.string(),
    url: z.string()
});

const ProviderJournalSchema = z.object({
    id: z.number(),
    url: z.string()
});

const ProviderLedgerEntrySchema = z.object({
    id: z.number()
});

const ProviderLetteredLinesSchema = z.object({
    ids: z.array(z.number()),
    url: z.string()
});

const ProviderLedgerEntryLineSchema = z.object({
    id: z.number(),
    debit: z.string(),
    credit: z.string(),
    label: z.string(),
    categories: z.array(ProviderCategorySchema),
    ledger_account: ProviderLedgerAccountSchema,
    journal: ProviderJournalSchema,
    date: z.string(),
    ledger_entry: ProviderLedgerEntrySchema,
    lettered_ledger_entry_lines: ProviderLetteredLinesSchema,
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderLedgerEntryLineSchema),
    has_more: z.boolean().nullable(),
    next_cursor: z.string().nullable()
});

const OutputSchema = z.object({
    items: z.array(ProviderLedgerEntryLineSchema),
    has_more: z.boolean().optional(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List ledger entry lines sharing the same lettering as a given line.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ledger_entries:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getledgerentrylinesletteredledgerentrylines
            endpoint: `/api/external/v2/ledger_entry_lines/${encodeURIComponent(String(input.ledger_entry_line_id))}/lettered_ledger_entry_lines`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No response data from Pennylane API.',
                ledger_entry_line_id: input.ledger_entry_line_id
            });
        }

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
