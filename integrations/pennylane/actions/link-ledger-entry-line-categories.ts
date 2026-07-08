import { z } from 'zod';
import { createAction } from 'nango';

const CategoryInputSchema = z.object({
    id: z.number().describe('Category ID. Example: 239432757248'),
    weight: z.string().describe('Weight for this category within its group. Example: "1"')
});

const InputSchema = z.object({
    ledger_entry_line_id: z.string().describe('The unique identifier of the ledger entry line. Example: "104374555205632"'),
    categories: z.array(CategoryInputSchema).describe('Array of categories to assign. Pass an empty array to remove all categories.')
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    label: z.string(),
    analytical_code: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    weight: z.string(),
    category_group: z.object({
        id: z.number()
    })
});

const ProviderLedgerEntryLineSchema = z.object({
    id: z.number(),
    label: z.string(),
    categories: z.array(ProviderCategorySchema)
});

const ProviderResponseSchema = z.object({
    ledger_entry_line: ProviderLedgerEntryLineSchema
});

const OutputSchema = z.object({
    id: z.number().describe('The ledger entry line ID'),
    label: z.string().optional(),
    categories: z
        .array(
            z.object({
                id: z.number(),
                label: z.string(),
                analytical_code: z.string().nullable().optional(),
                created_at: z.string().optional(),
                updated_at: z.string().optional(),
                weight: z.string(),
                category_group_id: z.number()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Replace categories assigned to a ledger entry line.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ledger_entries:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://pennylane.readme.io/reference/putledgerentrylinescategories
            endpoint: `/api/external/v2/ledger_entry_lines/${encodeURIComponent(input.ledger_entry_line_id)}/categories`,
            data: input.categories,
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const line = providerResponse.ledger_entry_line;

        return {
            id: line.id,
            label: line.label,
            categories: line.categories.map((cat) => ({
                id: cat.id,
                label: cat.label,
                analytical_code: cat.analytical_code,
                created_at: cat.created_at,
                updated_at: cat.updated_at,
                weight: cat.weight,
                category_group_id: cat.category_group.id
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
