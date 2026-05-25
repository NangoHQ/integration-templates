import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_key: z.string().describe('The file key to add the comment to. Example: "UzYlOaPNPL2c7zmHCEljOs"'),
    message: z.string().describe('The text contents of the comment to post.'),
    comment_id: z.string().optional().describe('The ID of the comment to reply to, if any. This must be a root comment.'),
    node_id: z.string().optional().describe('The node ID to attach the comment to. Example: "91:1"'),
    node_offset_x: z.number().optional().describe('X coordinate offset within the node from the top-left corner.'),
    node_offset_y: z.number().optional().describe('Y coordinate offset within the node from the top-left corner.')
});

const UserSchema = z.object({
    id: z.string(),
    handle: z.string(),
    img_url: z.string().optional()
});

const ReactionSchema = z.object({
    user: UserSchema,
    emoji: z.string(),
    created_at: z.string().optional()
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

const ClientMetaSchema = z.union([VectorSchema, FrameOffsetSchema, RegionSchema, FrameOffsetRegionSchema]);

const ProviderCommentSchema = z.object({
    id: z.string(),
    client_meta: ClientMetaSchema.nullable().optional(),
    file_key: z.string().optional(),
    parent_id: z.string().nullable().optional(),
    user: UserSchema.optional(),
    created_at: z.string().optional(),
    resolved_at: z.string().nullable().optional(),
    message: z.string().optional(),
    order_id: z.string().nullable().optional(),
    reactions: z.array(ReactionSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    client_meta: ClientMetaSchema.nullable().optional(),
    file_key: z.string().optional(),
    parent_id: z.string().nullable().optional(),
    user: UserSchema.optional(),
    created_at: z.string().optional(),
    resolved_at: z.string().nullable().optional(),
    message: z.string().optional(),
    order_id: z.string().nullable().optional(),
    reactions: z.array(ReactionSchema).optional()
});

const action = createAction({
    description: 'Create a comment in Figma.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['file_comments:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            message: input.message
        };

        if (input.comment_id !== undefined) {
            body['comment_id'] = input.comment_id;
        }

        if (input.node_id !== undefined && input.node_offset_x !== undefined && input.node_offset_y !== undefined) {
            body['client_meta'] = {
                node_id: input.node_id,
                node_offset: {
                    x: input.node_offset_x,
                    y: input.node_offset_y
                }
            };
        }

        // https://www.figma.com/developers/api#post-comments-endpoint
        const response = await nango.post({
            endpoint: `/v1/files/${encodeURIComponent(input.file_key)}/comments`,
            data: body,
            retries: 1
        });

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            ...(providerComment.client_meta !== undefined && { client_meta: providerComment.client_meta }),
            ...(providerComment.file_key !== undefined && { file_key: providerComment.file_key }),
            ...(providerComment.parent_id !== undefined && { parent_id: providerComment.parent_id }),
            ...(providerComment.user !== undefined && { user: providerComment.user }),
            ...(providerComment.created_at !== undefined && { created_at: providerComment.created_at }),
            ...(providerComment.resolved_at !== undefined && { resolved_at: providerComment.resolved_at }),
            ...(providerComment.message !== undefined && { message: providerComment.message }),
            ...(providerComment.order_id !== undefined && { order_id: providerComment.order_id }),
            ...(providerComment.reactions !== undefined && { reactions: providerComment.reactions })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
