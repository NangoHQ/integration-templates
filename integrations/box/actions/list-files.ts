import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    folder_id: z.string().describe('The unique identifier for the folder. The root folder is always represented by the ID `0`. Example: "0"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().max(1000).optional().describe('The maximum number of items to return per page. Maximum is 1000.'),
    sort: z.enum(['id', 'name', 'date', 'size']).optional().describe('Defines the second attribute by which items are sorted.'),
    direction: z.enum(['ASC', 'DESC']).optional().describe('The direction to sort results in.')
});

const ProviderItemSchema = z
    .object({
        id: z.string(),
        type: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderItemSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List files from Box.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.box.com/reference/get-folders-id-items/
            endpoint: `/2.0/folders/${input.folder_id}/items`,
            params: {
                usemarker: 'true',
                ...(input.cursor !== undefined && { marker: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.direction !== undefined && { direction: input.direction })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                entries: z.array(ProviderItemSchema),
                next_marker: z.string().nullable().optional()
            })
            .parse(response.data);

        return {
            items: providerResponse.entries,
            ...(providerResponse.next_marker != null && { next_cursor: providerResponse.next_marker })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
