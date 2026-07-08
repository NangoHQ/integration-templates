import * as z from 'zod';
import { createAction } from 'nango';

const JournalSchema = z
    .object({
        id: z.number().describe('Journal ID. Example: 123456'),
        code: z.string().describe('Journal code. Example: "VT"'),
        label: z.string().describe('Journal label. Example: "Ventes"')
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        items: z.array(JournalSchema),
        has_more: z.boolean().nullish(),
        next_cursor: z.string().nullish()
    })
    .passthrough();

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 100.')
});

const OutputSchema = z.object({
    items: z.array(JournalSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean().optional()
});

const action = createAction({
    description: 'List accounting journals.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['journals:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getjournals
            endpoint: '/api/external/v2/journals',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items,
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor }),
            ...(providerResponse.has_more != null && { has_more: providerResponse.has_more })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
