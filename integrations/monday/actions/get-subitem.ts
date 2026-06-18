import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    subitem_id: z.string().describe('The ID of the subitem to retrieve. Example: "2933645613"')
});

const ProviderColumnValueSchema = z.object({
    id: z.string(),
    text: z.string().nullable().optional()
});

const ProviderSubitemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    board: z
        .object({
            id: z.string()
        })
        .optional(),
    column_values: z.array(ProviderColumnValueSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    board_id: z.string().optional(),
    column_values: z
        .array(
            z.object({
                id: z.string(),
                text: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Retrieve a single subitem from monday.com.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.monday.com/api-reference/docs/subitems
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query: 'query ($ids: [ID!]) { items(ids: $ids) { id name board { id } column_values { id text } } }',
                variables: {
                    ids: [input.subitem_id]
                }
            },
            retries: 3
        });

        const body = z
            .object({
                data: z
                    .object({
                        items: z.array(ProviderSubitemSchema).optional()
                    })
                    .optional()
            })
            .parse(response.data);

        const items = body.data?.items;
        if (!items || items.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Subitem with ID ${input.subitem_id} not found.`
            });
        }

        const subitem = ProviderSubitemSchema.parse(items[0]);

        return {
            id: subitem.id,
            ...(subitem.name !== undefined && { name: subitem.name }),
            ...(subitem.board?.id !== undefined && { board_id: subitem.board.id }),
            ...(subitem.column_values !== undefined && {
                column_values: subitem.column_values.map((cv) => ({
                    id: cv.id,
                    ...(cv.text != null && { text: cv.text })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
