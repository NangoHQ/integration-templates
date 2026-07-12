import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(1000).optional().describe('Number of items to return per request. Defaults to 20.')
});

const ProviderLedgerAccountSchema = z
    .object({
        id: z.number(),
        number: z.string(),
        label: z.string().optional(),
        url: z.string().optional(),
        vat_rate: z.string().optional(),
        country_alpha2: z.string().optional(),
        enabled: z.boolean().optional()
    })
    .passthrough();

const ProviderListResponseSchema = z.object({
    items: z.array(ProviderLedgerAccountSchema),
    has_more: z.boolean(),
    next_cursor: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.number(),
            number: z.string(),
            label: z.string().optional(),
            url: z.string().optional(),
            vat_rate: z.string().optional(),
            country_alpha2: z.string().optional(),
            enabled: z.boolean().optional()
        })
    ),
    next_cursor: z.string().optional(),
    has_more: z.boolean()
});

const action = createAction({
    description: 'List ledger accounts',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ledger_accounts:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getledgeraccounts
            endpoint: '/api/external/v2/ledger_accounts',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const parsed = ProviderListResponseSchema.parse(response.data);

        return {
            items: parsed.items.map((item) => ({
                id: item.id,
                number: item.number,
                ...(item.label !== undefined && { label: item.label }),
                ...(item.url !== undefined && { url: item.url }),
                ...(item.vat_rate !== undefined && { vat_rate: item.vat_rate }),
                ...(item.country_alpha2 !== undefined && { country_alpha2: item.country_alpha2 }),
                ...(item.enabled !== undefined && { enabled: item.enabled })
            })),
            has_more: parsed.has_more,
            ...(parsed.next_cursor != null && { next_cursor: parsed.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
