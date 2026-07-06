import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderListAttributesSchema = z.object({
    name: z.string(),
    created: z.string().optional(),
    updated: z.string().optional(),
    opt_in_process: z.string().optional()
});

const ProviderListDataSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: ProviderListAttributesSchema
});

const ProviderListResponseSchema = z.object({
    data: z.array(ProviderListDataSchema),
    links: z
        .object({
            self: z.string().nullable().optional(),
            next: z.string().nullable().optional(),
            prev: z.string().nullable().optional()
        })
        .optional()
});

const ListSchema = z.object({
    id: z.string(),
    name: z.string(),
    created: z.string().optional(),
    updated: z.string().optional(),
    opt_in_process: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ListSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List lists.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['lists:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.klaviyo.com/en/reference/get_lists
        const response = await nango.get({
            endpoint: '/api/lists',
            headers: {
                revision: '2026-04-15'
            },
            params: {
                ...(input.cursor && { 'page[cursor]': input.cursor }),
                'page[size]': 10
            },
            retries: 3
        });

        const apiResponse = ProviderListResponseSchema.parse(response.data);

        const nextCursorUrl = apiResponse.links?.next;
        let next_cursor: string | undefined;
        if (nextCursorUrl) {
            const url = new URL(nextCursorUrl);
            next_cursor = url.searchParams.get('page[cursor]') ?? undefined;
        }

        return {
            items: apiResponse.data.map((item) => ({
                id: item.id,
                name: item.attributes.name,
                ...(item.attributes.created !== undefined && { created: item.attributes.created }),
                ...(item.attributes.updated !== undefined && { updated: item.attributes.updated }),
                ...(item.attributes.opt_in_process !== undefined && { opt_in_process: item.attributes.opt_in_process })
            })),
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
