import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    item_id: z.string().describe('The item ID to delete or archive. Example: "2933609588"'),
    permanent: z.boolean().optional().describe('If true, permanently delete the item. If false or omitted, archive the item (recoverable).')
});

const ProviderArchiveItemSchema = z.object({
    id: z.string()
});

const ProviderDeleteItemSchema = z.object({
    id: z.string()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            archive_item: ProviderArchiveItemSchema.optional().nullable(),
            delete_item: ProviderDeleteItemSchema.optional().nullable()
        })
        .optional()
        .nullable(),
    errors: z.array(z.unknown()).optional().nullable()
});

const OutputSchema = z.object({
    item_id: z.string(),
    operation: z.enum(['archive', 'delete']),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete or archive an item in monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-item',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const isPermanent = input.permanent === true;
        const operation = isPermanent ? 'delete' : 'archive';
        const mutation = isPermanent
            ? 'mutation($itemId: ID!) { delete_item(item_id: $itemId) { id } }'
            : 'mutation($itemId: ID!) { archive_item(item_id: $itemId) { id } }';

        const config: ProxyConfiguration = {
            // https://developer.monday.com/api-reference/docs/items
            endpoint: '/v2',
            data: {
                query: mutation,
                variables: {
                    itemId: input.item_id
                }
            },
            retries: 3,
            headers: {
                'api-version': '2026-04'
            }
        };

        const response = await nango.post(config);

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Failed to ${operation} item: ${JSON.stringify(parsed.errors)}`,
                item_id: input.item_id
            });
        }

        const resultData = parsed.data;
        const resultItem = isPermanent ? resultData?.delete_item : resultData?.archive_item;

        if (!resultItem) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Item ${input.item_id} not found or could not be ${operation}d.`,
                item_id: input.item_id
            });
        }

        return {
            item_id: resultItem.id,
            operation,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
