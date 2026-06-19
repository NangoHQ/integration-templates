import { z } from 'zod';
import { createAction } from 'nango';

const ThumbnailSchema = z.object({
    width: z.number(),
    height: z.number(),
    url: z.string()
});

const BrandTemplateSchema = z.object({
    id: z.string(),
    title: z.string(),
    view_url: z.string(),
    create_url: z.string(),
    thumbnail: ThumbnailSchema.optional(),
    created_at: z.number(),
    updated_at: z.number()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    query: z.string().optional().describe('Search term or terms to filter brand templates.'),
    limit: z.number().min(1).max(100).optional().describe('The number of brand templates to return. Defaults to 25.'),
    ownership: z.enum(['any', 'owned', 'shared']).optional().describe('Filter by ownership.'),
    sort_by: z.enum(['relevance', 'modified_descending', 'modified_ascending', 'title_descending', 'title_ascending']).optional().describe('Sort order.'),
    dataset: z.enum(['any', 'non_empty']).optional().describe('Filter by dataset definitions.')
});

const OutputSchema = z.object({
    items: z.array(BrandTemplateSchema),
    continuation: z.string().optional().describe('Pagination cursor for the next page.')
});

const action = createAction({
    description: 'List brand templates.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['brandtemplate:meta:read'],
    endpoint: {
        path: '/actions/list-brand-templates',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.canva.dev/docs/connect/api-reference/brand-templates/list-brand-templates/
            endpoint: '/rest/v1/brand-templates',
            params: {
                ...(input.cursor !== undefined && { continuation: input.cursor }),
                ...(input.query !== undefined && { query: input.query }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.ownership !== undefined && { ownership: input.ownership }),
                ...(input.sort_by !== undefined && { sort_by: input.sort_by }),
                ...(input.dataset !== undefined && { dataset: input.dataset })
            },
            retries: 3
        });

        const parsed = z
            .object({
                items: z.array(z.unknown()),
                continuation: z.string().optional()
            })
            .parse(response.data);

        const items = parsed.items.map((item: unknown) => {
            const template = BrandTemplateSchema.safeParse(item);
            if (!template.success) {
                throw new Error('Unexpected brand template shape from provider.');
            }
            return template.data;
        });

        return {
            items,
            ...(parsed.continuation !== undefined && { continuation: parsed.continuation })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
