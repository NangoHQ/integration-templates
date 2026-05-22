import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    item_id: z.string().describe('The ID of the item to archive. Example: "2933609588"')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            archive_item: z
                .object({
                    id: z.string(),
                    state: z.string().optional()
                })
                .optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                extensions: z
                    .object({
                        code: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    state: z.string().optional()
});

const action = createAction({
    description: 'Archive an item in monday.com (sets state to archived, distinct from delete).',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/archive-item',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.monday.com/api-reference/docs/items
            endpoint: '/v2',
            data: {
                query: `
                    mutation ($item_id: ID!) {
                        archive_item(item_id: $item_id) {
                            id
                            state
                        }
                    }
                `,
                variables: {
                    item_id: input.item_id
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const firstError = providerResponse.errors?.[0];
        if (firstError) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstError.message,
                code: firstError.extensions?.code
            });
        }

        if (!providerResponse.data?.archive_item) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Item not found or could not be archived.'
            });
        }

        const archivedItem = providerResponse.data.archive_item;

        return {
            id: archivedItem.id,
            ...(archivedItem.state != null && { state: archivedItem.state })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
