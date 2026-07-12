import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('The unique identifier of the board. Example: "1099300658984851677"'),
    cursor: z.string().optional().describe('Pagination cursor (bookmark) from the previous response. Omit for the first page.')
});

const ProviderSectionSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional().nullable()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string().optional(),
            name: z.string().optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List sections on a board.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/board_sections/list
            endpoint: `/v5/boards/${encodeURIComponent(input.board_id)}/sections`,
            params: {
                ...(input.cursor !== undefined && { bookmark: input.cursor })
            },
            retries: 3
        });

        const parsed = z
            .object({
                items: z.array(ProviderSectionSchema).optional().default([]),
                bookmark: z.string().optional().nullable()
            })
            .parse(response.data);

        return {
            items: parsed.items.map((item) => ({
                ...(item.id !== undefined && { id: item.id }),
                ...(item.name != null && { name: item.name })
            })),
            ...(parsed.bookmark != null && { next_cursor: parsed.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
