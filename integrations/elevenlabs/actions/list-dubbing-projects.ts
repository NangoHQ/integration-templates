import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(200).optional().describe('How many dubs to return at maximum. Cannot exceed 200, defaults to 100.'),
    dubbing_status: z.enum(['dubbing', 'dubbed', 'failed']).optional().describe('What state the dub is currently in.'),
    filter_by_creator: z.enum(['personal', 'others', 'all']).optional().describe('Filters who created the resources being listed. Defaults to all.'),
    order_by: z.literal('created_at').optional().describe('The field to use for ordering results from this query.'),
    order_direction: z.enum(['DESCENDING', 'ASCENDING']).optional().describe('The order direction to use for results from this query. Defaults to DESCENDING.')
});

const MediaMetadataSchema = z.object({
    content_type: z.string().optional(),
    duration: z.number().optional()
});

const DubSchema = z.object({
    dubbing_id: z.string().optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    source_language: z.string().nullable().optional(),
    target_languages: z.array(z.string()).optional(),
    created_at: z.string().optional(),
    editable: z.boolean().optional(),
    media_metadata: MediaMetadataSchema.nullable().optional(),
    error: z.string().nullable().optional()
});

const OutputSchema = z.object({
    dubs: z.array(DubSchema),
    has_more: z.boolean().optional(),
    next_cursor: z.string().optional().nullable()
});

const action = createAction({
    description: 'List dubbing projects.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    endpoint: {
        method: 'GET',
        path: '/actions/list-dubbing-projects'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://elevenlabs.io/docs/api-reference/dubbing/list
            endpoint: '/v1/dubbing',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.page_size !== undefined && { page_size: String(input.page_size) }),
                ...(input.dubbing_status !== undefined && { dubbing_status: input.dubbing_status }),
                ...(input.filter_by_creator !== undefined && { filter_by_creator: input.filter_by_creator }),
                ...(input.order_by !== undefined && { order_by: input.order_by }),
                ...(input.order_direction !== undefined && { order_direction: input.order_direction })
            },
            retries: 3
        });

        const parsed = z
            .object({
                dubs: z.array(z.record(z.string(), z.unknown())),
                has_more: z.boolean().optional(),
                next_cursor: z.string().nullable().optional()
            })
            .parse(response.data);

        const dubs = parsed.dubs || [];

        return {
            dubs: dubs.map((item: Record<string, unknown>) => {
                const dub = DubSchema.parse(item);
                return {
                    ...(dub.dubbing_id !== undefined && { dubbing_id: dub.dubbing_id }),
                    ...(dub.name !== undefined && { name: dub.name }),
                    ...(dub.status !== undefined && { status: dub.status }),
                    ...(dub.source_language !== undefined && { source_language: dub.source_language }),
                    ...(dub.target_languages !== undefined && { target_languages: dub.target_languages }),
                    ...(dub.created_at !== undefined && { created_at: dub.created_at }),
                    ...(dub.editable !== undefined && { editable: dub.editable }),
                    ...(dub.media_metadata !== undefined && { media_metadata: dub.media_metadata }),
                    ...(dub.error !== undefined && { error: dub.error })
                };
            }),
            ...(parsed.has_more !== undefined && { has_more: parsed.has_more }),
            ...(parsed.next_cursor !== undefined && { next_cursor: parsed.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
