import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().int().min(1).optional().describe('Page number. Default is 1.'),
    per_page: z.number().int().min(1).max(50).optional().describe('Number of results per page. Default is 20, maximum is 50.')
});

const TagSchema = z.object({
    id: z.number(),
    direct_link: z.string().optional(),
    name: z.string(),
    color: z.string(),
    description: z.string().nullable().optional()
});

const MetaSchema = z.object({
    count: z.number(),
    total: z.number(),
    current_page: z.number(),
    per_page: z.number(),
    next_page_link: z.string().nullable().optional(),
    previous_page_link: z.string().nullable().optional()
});

const OutputSchema = z.object({
    tags: z.array(TagSchema),
    meta: MetaSchema
});

const action = createAction({
    description: 'List tags from Aircall.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-tags'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.aircall.io/api-references/#list-all-tags
        const response = await nango.get({
            endpoint: '/v1/tags',
            params: {
                ...(input.page !== undefined && { page: String(input.page) }),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                tags: z.array(TagSchema),
                meta: MetaSchema
            })
            .parse(response.data);

        return {
            tags: providerResponse.tags.map((tag) => ({
                id: tag.id,
                ...(tag.direct_link !== undefined && { direct_link: tag.direct_link }),
                name: tag.name,
                color: tag.color,
                ...(tag.description != null && { description: tag.description })
            })),
            meta: providerResponse.meta
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
