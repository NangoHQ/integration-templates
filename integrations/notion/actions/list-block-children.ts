import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    block_id: z.string().describe('Block ID or page ID to retrieve children for. Example: "c02fc1d3-db8b-45c5-a222-27595b15aea7"'),
    page_size: z.number().min(1).max(100).optional().describe('Number of results per page (max 100).'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const BlockSchema = z
    .object({
        object: z.string(),
        id: z.string(),
        type: z.string(),
        created_time: z.string().optional(),
        last_edited_time: z.string().optional(),
        created_by: z.object({}).passthrough().optional(),
        last_edited_by: z.object({}).passthrough().optional(),
        has_children: z.boolean().optional(),
        in_trash: z.boolean().optional(),
        parent: z.object({}).passthrough().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    results: z.array(BlockSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean()
});

const ProviderResponseSchema = z.object({
    object: z.string(),
    results: z.array(z.unknown()),
    next_cursor: z.string().nullable(),
    has_more: z.boolean()
});

const action = createAction({
    description: 'List child blocks for a page or block with pagination.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:content'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.notion.com/reference/get-block-children
        const response = await nango.get({
            endpoint: `/v1/blocks/${encodeURIComponent(input.block_id)}/children`,
            params: {
                ...(input.page_size !== undefined && { page_size: String(input.page_size) }),
                ...(input.cursor !== undefined && { start_cursor: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const results = parsed.results.map((item) => BlockSchema.parse(item));

        return {
            results,
            ...(parsed.next_cursor != null && { next_cursor: parsed.next_cursor }),
            has_more: parsed.has_more
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
