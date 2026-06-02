import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_key: z.string().describe('Figma file key. Example: "UzYlOaPNPL2c7zmHCEljOs"'),
    comment_id: z.string().describe('Comment ID. Example: "1774450119"')
});

const UserSchema = z.object({
    id: z.string(),
    handle: z.string(),
    img_url: z.string().optional(),
    email: z.string().optional()
});

const NodeOffsetSchema = z.object({
    x: z.number(),
    y: z.number()
});

const ClientMetaSchema = z.object({
    node_id: z.string().optional(),
    node_type: z.string().optional(),
    node_offset: NodeOffsetSchema.optional()
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    file_key: z.string().optional(),
    parent_id: z.string().nullable().optional(),
    user: UserSchema,
    created_at: z.string(),
    resolved_at: z.string().nullable().optional(),
    message: z.string(),
    client_meta: ClientMetaSchema.nullable().optional(),
    order_id: z.string().optional()
});

const ProviderCommentsResponseSchema = z.object({
    comments: z.array(ProviderCommentSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    file_key: z.string().optional(),
    parent_id: z.string().optional(),
    user: z.object({
        id: z.string(),
        handle: z.string(),
        img_url: z.string().optional(),
        email: z.string().optional()
    }),
    created_at: z.string(),
    resolved_at: z.string().optional(),
    message: z.string(),
    client_meta: z
        .object({
            node_id: z.string().optional(),
            node_type: z.string().optional(),
            node_offset: z
                .object({
                    x: z.number(),
                    y: z.number()
                })
                .optional()
        })
        .optional(),
    order_id: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single comment from Figma.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['file_comments:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.figma.com/developers/api#get-comments-endpoint
        const response = await nango.get({
            endpoint: `/v1/files/${encodeURIComponent(input.file_key)}/comments`,
            retries: 3
        });

        const providerResponse = ProviderCommentsResponseSchema.parse(response.data);
        const comment = providerResponse.comments.find((c) => c.id === input.comment_id);

        if (!comment) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Comment ${input.comment_id} not found in file ${input.file_key}.`
            });
        }

        return {
            id: comment.id,
            ...(comment.file_key !== undefined && { file_key: comment.file_key }),
            ...(comment.parent_id != null && { parent_id: comment.parent_id }),
            user: {
                id: comment.user.id,
                handle: comment.user.handle,
                ...(comment.user.img_url !== undefined && { img_url: comment.user.img_url }),
                ...(comment.user.email !== undefined && { email: comment.user.email })
            },
            created_at: comment.created_at,
            ...(comment.resolved_at != null && { resolved_at: comment.resolved_at }),
            message: comment.message,
            ...(comment.client_meta != null && {
                client_meta: {
                    ...(comment.client_meta.node_id !== undefined && { node_id: comment.client_meta.node_id }),
                    ...(comment.client_meta.node_type !== undefined && { node_type: comment.client_meta.node_type }),
                    ...(comment.client_meta.node_offset !== undefined && {
                        node_offset: {
                            x: comment.client_meta.node_offset.x,
                            y: comment.client_meta.node_offset.y
                        }
                    })
                }
            }),
            ...(comment.order_id !== undefined && { order_id: comment.order_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
