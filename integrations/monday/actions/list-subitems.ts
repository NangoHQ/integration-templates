import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    parent_item_id: z.string().describe('Parent item ID. Example: "2933602562"')
});

const ProviderColumnValueSchema = z.object({
    id: z.string(),
    text: z.string().nullable().optional()
});

const ProviderSubitemSchema = z.object({
    id: z.string(),
    name: z.string(),
    board: z.object({
        id: z.string()
    }),
    column_values: z.array(ProviderColumnValueSchema).optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            items: z
                .array(
                    z.object({
                        subitems: z.array(ProviderSubitemSchema).optional()
                    })
                )
                .optional()
        })
        .optional()
});

const ColumnValueSchema = z.object({
    id: z.string(),
    text: z.string().optional()
});

const SubitemSchema = z.object({
    id: z.string(),
    name: z.string(),
    board_id: z.string(),
    column_values: z.array(ColumnValueSchema).optional()
});

const OutputSchema = z.object({
    subitems: z.array(SubitemSchema)
});

const action = createAction({
    description: 'List subitems of a parent item in monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-subitems',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query($ids: [ID!]) {
                items(ids: $ids) {
                    subitems {
                        id
                        name
                        board {
                            id
                        }
                        column_values {
                            id
                            text
                        }
                    }
                }
            }
        `;

        // https://developer.monday.com/api-reference/docs
        const response = await nango.post({
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query,
                variables: { ids: [input.parent_item_id] }
            },
            retries: 3
        });

        if (response.data && 'errors' in response.data && Array.isArray(response.data.errors) && response.data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'GraphQL error from monday.com',
                errors: response.data.errors
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);
        const items = parsed.data?.items ?? [];

        if (items.length === 0) {
            return { subitems: [] };
        }

        const subitems = items[0]?.subitems ?? [];

        return {
            subitems: subitems.map((subitem) => ({
                id: subitem.id,
                name: subitem.name,
                board_id: subitem.board.id,
                column_values:
                    subitem.column_values?.map((cv) => ({
                        id: cv.id,
                        ...(cv.text != null && { text: cv.text })
                    })) ?? []
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
