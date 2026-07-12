import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of items to return per page. Defaults to 20.'),
    sort: z.string().optional().describe('Sort field prefixed with - for descending order. Available: id, date. Default: -id.'),
    filter: z.string().optional().describe('JSON array of filter objects.')
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    label: z.string(),
    weight: z.string(),
    category_group: z.object({
        id: z.number()
    }),
    analytical_code: z.string().nullable().optional(),
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

const ProviderLetteredLedgerEntryLinesSchema = z.object({
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
    lettered_ledger_entry_lines: ProviderLetteredLedgerEntryLinesSchema,
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderResponseSchema = z.object({
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    items: z.array(ProviderLedgerEntryLineSchema)
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.number(),
            debit: z.string(),
            credit: z.string(),
            label: z.string(),
            categories: z.array(
                z.object({
                    id: z.number(),
                    label: z.string(),
                    weight: z.string(),
                    category_group: z.object({
                        id: z.number()
                    }),
                    analytical_code: z.string().optional(),
                    created_at: z.string(),
                    updated_at: z.string()
                })
            ),
            ledger_account: z.object({
                id: z.number(),
                number: z.string(),
                url: z.string()
            }),
            journal: z.object({
                id: z.number(),
                url: z.string()
            }),
            date: z.string(),
            ledger_entry: z.object({
                id: z.number()
            }),
            lettered_ledger_entry_lines: z.object({
                ids: z.array(z.number()),
                url: z.string()
            }),
            created_at: z.string(),
            updated_at: z.string()
        })
    ),
    next_cursor: z.string().optional(),
    has_more: z.boolean()
});

const action = createAction({
    description: 'List ledger entry lines.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ledger_entries:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://pennylane.readme.io/reference/getledgerentrylines
        const response = await nango.get({
            endpoint: '/api/external/v2/ledger_entry_lines',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.filter !== undefined && { filter: input.filter })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map((item) => ({
                id: item.id,
                debit: item.debit,
                credit: item.credit,
                label: item.label,
                categories: item.categories.map((category) => ({
                    id: category.id,
                    label: category.label,
                    weight: category.weight,
                    category_group: {
                        id: category.category_group.id
                    },
                    ...(category.analytical_code != null && { analytical_code: category.analytical_code }),
                    created_at: category.created_at,
                    updated_at: category.updated_at
                })),
                ledger_account: {
                    id: item.ledger_account.id,
                    number: item.ledger_account.number,
                    url: item.ledger_account.url
                },
                journal: {
                    id: item.journal.id,
                    url: item.journal.url
                },
                date: item.date,
                ledger_entry: {
                    id: item.ledger_entry.id
                },
                lettered_ledger_entry_lines: {
                    ids: item.lettered_ledger_entry_lines.ids,
                    url: item.lettered_ledger_entry_lines.url
                },
                created_at: item.created_at,
                updated_at: item.updated_at
            })),
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor }),
            has_more: providerResponse.has_more
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
