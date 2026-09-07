import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        limit: z.number().int().min(1).max(250).optional().describe('Maximum number of records to return per page. Range: 1-250, default 50.'),
        title: z.string().optional().describe('Filter by collection title.'),
        handle: z.string().optional().describe('Filter by collection handle.'),
        ids: z.string().optional().describe('Comma-separated list of collection IDs to filter by.'),
        since_id: z.string().optional().describe('Return collections with an ID greater than this value.'),
        updated_at_min: z.string().optional().describe('ISO 8601 timestamp. Return collections updated at or after this time.'),
        updated_at_max: z.string().optional().describe('ISO 8601 timestamp. Return collections updated at or before this time.'),
        fields: z.string().optional().describe('Comma-separated list of fields to include in the response.')
    })
    .describe('Input for listing manual (custom) collections.');

const CollectionSchema = z.object({
    id: z.string().describe('Unique identifier for the collection.'),
    title: z.string().describe('Title of the collection.'),
    handle: z.string().describe('URL-friendly handle for the collection.'),
    body_html: z.string().nullable().optional().describe('HTML description of the collection.'),
    published_at: z.string().nullable().optional().describe('ISO 8601 timestamp when the collection was published. Null if not published.'),
    published_scope: z.string().optional().describe('Scope of publication, e.g., "web" or "global".'),
    sort_order: z.string().optional().describe('Sort order of products within the collection, e.g., "manual", "best-selling".'),
    template_suffix: z.string().nullable().optional().describe('Template suffix for the collection page.'),
    updated_at: z.string().describe('ISO 8601 timestamp when the collection was last updated.')
});

const OutputSchema = z
    .object({
        custom_collections: z.array(CollectionSchema).describe('Array of manual (custom) collections.'),
        next_page_info: z.string().optional().describe('Pagination cursor for the next page. Absent when there are no more pages.')
    })
    .describe('Output for listing manual (custom) collections.');

/**
 * @tags: [read]
 * @tagReason: This action only reads manual (custom) collections from the SHOPLINE Admin REST API.
 * @pitfalls: The provider returns template_path rather than template_suffix, so the schema's template_suffix field is always absent in the output.
 */
const action = createAction({
    description: 'List manual (custom) collections.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/products/custom_collections/get-custom-collections
            endpoint: '/admin/openapi/v20260601/products/custom_collections.json',
            params: {
                ...(input.cursor !== undefined && { page_info: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.title !== undefined && { title: input.title }),
                ...(input.handle !== undefined && { handle: input.handle }),
                ...(input.ids !== undefined && { ids: input.ids }),
                ...(input.since_id !== undefined && { since_id: input.since_id }),
                ...(input.updated_at_min !== undefined && { updated_at_min: input.updated_at_min }),
                ...(input.updated_at_max !== undefined && { updated_at_max: input.updated_at_max }),
                ...(input.fields !== undefined && { fields: input.fields })
            },
            retries: 3
        });

        const data = z
            .object({
                custom_collections: z.array(z.unknown()).default([])
            })
            .parse(response.data);

        let next_page_info: string | undefined;
        const linkHeader = response.headers['link'] || response.headers['Link'];
        if (typeof linkHeader === 'string') {
            const nextMatch = linkHeader.match(/<[^>]*[?&]page_info=([^&>]*)[^>]*>;\s*rel="next"/);
            if (nextMatch && nextMatch[1]) {
                next_page_info = nextMatch[1];
            }
        }

        const custom_collections = data.custom_collections.map((item) => {
            return CollectionSchema.parse(item);
        });

        return {
            custom_collections,
            ...(next_page_info !== undefined && { next_page_info })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
