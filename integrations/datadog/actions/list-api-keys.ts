import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderApiKeyAttributesSchema = z.object({
    name: z.string(),
    created_at: z.string().nullish(),
    modified_at: z.string().nullish(),
    last4: z.string().nullish(),
    key: z.string().nullish()
});

const ProviderApiKeySchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: ProviderApiKeyAttributesSchema
});

const OutputApiKeyAttributesSchema = z.object({
    name: z.string(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    last4: z.string().optional(),
    key: z.string().optional()
});

const OutputApiKeySchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: OutputApiKeyAttributesSchema
});

const OutputSchema = z.object({
    items: z.array(OutputApiKeySchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List API keys configured for this account (metadata only, not secret values).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const pageNumber = input.cursor ? Number(input.cursor) : 0;
        if (Number.isNaN(pageNumber)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid page number string'
            });
        }

        const pageSize = 100;

        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/key-management/#get-all-api-keys
            endpoint: 'v2/api_keys',
            params: {
                'page[size]': String(pageSize),
                'page[number]': String(pageNumber)
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z.array(z.unknown()),
                meta: z
                    .object({
                        page: z
                            .object({
                                total_filtered_count: z.number()
                            })
                            .passthrough()
                    })
                    .passthrough()
            })
            .parse(response.data);

        const items = providerResponse.data.map((item) => {
            const parsed = ProviderApiKeySchema.parse(item);
            return {
                id: parsed.id,
                type: parsed.type,
                attributes: {
                    name: parsed.attributes.name,
                    ...(parsed.attributes.created_at != null && { created_at: parsed.attributes.created_at }),
                    ...(parsed.attributes.modified_at != null && { modified_at: parsed.attributes.modified_at }),
                    ...(parsed.attributes.last4 != null && { last4: parsed.attributes.last4 }),
                    ...(parsed.attributes.key != null && { key: parsed.attributes.key })
                }
            };
        });

        const hasMore = items.length === pageSize;

        return {
            items,
            ...(hasMore && { next_cursor: String(pageNumber + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
