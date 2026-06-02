import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_key: z.string().describe('File key to list comments from. Example: "UzYlOaPNPL2c7zmHCEljOs"'),
    as_md: z.boolean().optional().describe('If enabled, returns comments as markdown equivalents when applicable.'),
    cursor: z.string().optional().describe('Pagination cursor. Not used by this endpoint; reserved for future compatibility.')
});

const VectorSchema = z.object({
    x: z.number(),
    y: z.number()
});

const FrameOffsetSchema = z.object({
    node_id: z.string(),
    node_offset: VectorSchema
});

const RegionSchema = z.object({
    x: z.number(),
    y: z.number(),
    region_height: z.number(),
    region_width: z.number(),
    comment_pin_corner: z.string().optional()
});

const FrameOffsetRegionSchema = z.object({
    node_id: z.string(),
    node_offset: VectorSchema,
    region_height: z.number(),
    region_width: z.number(),
    comment_pin_corner: z.string().optional()
});

const UserSchema = z.object({
    id: z.string(),
    handle: z.string(),
    img_url: z.string()
});

const ReactionSchema = z.object({
    user: UserSchema,
    emoji: z.string(),
    created_at: z.string()
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    client_meta: z.union([VectorSchema, FrameOffsetSchema, RegionSchema, FrameOffsetRegionSchema]),
    file_key: z.string(),
    parent_id: z.string().optional(),
    user: UserSchema,
    created_at: z.string(),
    resolved_at: z.string().nullable(),
    message: z.string(),
    order_id: z.string().nullable(),
    reactions: z.array(ReactionSchema)
});

const CommentSchema = z.object({
    id: z.string(),
    file_key: z.string(),
    client_meta: z.union([VectorSchema, FrameOffsetSchema, RegionSchema, FrameOffsetRegionSchema]).optional(),
    parent_id: z.string().optional(),
    user: UserSchema,
    created_at: z.string(),
    resolved_at: z.string().optional(),
    message: z.string(),
    order_id: z.string().optional(),
    reactions: z.array(ReactionSchema)
});

const OutputSchema = z.object({
    items: z.array(CommentSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List comments from Figma.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-comments',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['file_comments:read', 'files:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.figma.com/developers/api#get-comments-endpoint
            endpoint: `/v1/files/${encodeURIComponent(input.file_key)}/comments`,
            params: {
                ...(input.as_md !== undefined && { as_md: String(input.as_md) })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                comments: z.array(z.unknown())
            })
            .parse(response.data);

        const items = providerResponse.comments.map((raw) => {
            const providerComment = ProviderCommentSchema.parse(raw);
            return {
                id: providerComment.id,
                file_key: providerComment.file_key,
                user: providerComment.user,
                created_at: providerComment.created_at,
                message: providerComment.message,
                reactions: providerComment.reactions,
                client_meta: providerComment.client_meta,
                ...(providerComment.parent_id !== undefined && { parent_id: providerComment.parent_id }),
                ...(providerComment.resolved_at !== null && { resolved_at: providerComment.resolved_at }),
                ...(providerComment.order_id !== null && { order_id: providerComment.order_id })
            };
        });

        return {
            items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
