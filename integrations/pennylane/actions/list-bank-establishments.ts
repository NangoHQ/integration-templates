import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 100.')
});

const ProviderBankEstablishmentSchema = z
    .object({
        id: z.number().describe('Bank establishment ID. Example: 9570'),
        name: z.string().describe('Bank establishment name. Example: "Revolut Business BE"'),
        created_at: z.string().describe('Creation timestamp in RFC3339 format. Example: "2026-07-02T06:06:58.430929Z"'),
        updated_at: z.string().describe('Last update timestamp in RFC3339 format. Example: "2026-07-03T00:30:04.687404Z"')
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    items: z.array(ProviderBankEstablishmentSchema),
    has_more: z.boolean().nullable().optional(),
    next_cursor: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderBankEstablishmentSchema),
    has_more: z.boolean().optional(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List bank establishments.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['bank_establishments:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getbankestablishments
            endpoint: '/bank_establishments',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items,
            ...(providerResponse.has_more != null && { has_more: providerResponse.has_more }),
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
