import { createSync } from 'nango';
import { z } from 'zod';

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

const ClientMetaSchema = z
    .object({
        node_id: z.string().optional(),
        node_offset: z
            .object({
                x: z.number(),
                y: z.number()
            })
            .optional(),
        stable_path: z.string().nullable().optional()
    })
    .passthrough();

const ProviderCommentSchema = z.object({
    id: z.string(),
    file_key: z.string(),
    parent_id: z.string().optional(),
    user: UserSchema,
    created_at: z.string(),
    resolved_at: z.string().nullable().optional(),
    message: z.string(),
    order_id: z.string().nullable().optional(),
    reactions: z.array(ReactionSchema),
    client_meta: ClientMetaSchema.optional()
});

const GetCommentsResponseSchema = z.object({
    comments: z.array(ProviderCommentSchema)
});

const FolderSchema = z.object({
    id: z.string(),
    name: z.string()
});

const GetTeamFoldersResponseSchema = z.object({
    name: z.string(),
    folders: z.array(FolderSchema)
});

const FileSchema = z.object({
    key: z.string(),
    name: z.string(),
    thumbnail_url: z.string().optional(),
    last_modified: z.string().optional()
});

const GetFolderFilesResponseSchema = z.object({
    name: z.string(),
    files: z.array(FileSchema)
});

const CommentSchema = z.object({
    id: z.string(),
    file_key: z.string(),
    parent_id: z.string().optional(),
    user_id: z.string(),
    user_handle: z.string().optional(),
    user_img_url: z.string().optional(),
    created_at: z.string(),
    resolved_at: z.string().optional(),
    message: z.string(),
    order_id: z.string().optional(),
    node_id: z.string().optional(),
    node_offset_x: z.number().optional(),
    node_offset_y: z.number().optional(),
    reactions: z.array(z.object({}).passthrough()).optional()
});

const MetadataSchema = z.object({
    team_id: z.string()
});

const sync = createSync({
    description: 'Sync comments from Figma',
    version: '1.1.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Comment: CommentSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/comments'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();

        if (!metadata?.team_id) {
            throw new Error('team_id is required in metadata');
        }

        // Blocker: Figma Comments API does not support modified_since, updated_after,
        // cursors, or pagination parameters. We must perform a full refresh.
        await nango.trackDeletesStart('Comment');

        // https://developers.figma.com/docs/rest-api/folders-endpoints/#get-team-folders-endpoint
        const foldersResponse = await nango.get({
            endpoint: `/v2/teams/${encodeURIComponent(metadata.team_id)}/folders`,
            retries: 3
        });

        const foldersData = GetTeamFoldersResponseSchema.parse(foldersResponse.data);
        const allComments: z.infer<typeof CommentSchema>[] = [];

        for (const folder of foldersData.folders) {
            // https://developers.figma.com/docs/rest-api/folders-endpoints/#get-folder-files-endpoint
            const filesResponse = await nango.get({
                endpoint: `/v2/folders/${encodeURIComponent(folder.id)}/files`,
                retries: 3
            });

            const filesData = GetFolderFilesResponseSchema.parse(filesResponse.data);

            for (const file of filesData.files) {
                // https://www.figma.com/developers/api#get-comments-endpoint
                const commentsResponse = await nango.get({
                    endpoint: `/v1/files/${encodeURIComponent(file.key)}/comments`,
                    retries: 3
                });

                const commentsData = GetCommentsResponseSchema.parse(commentsResponse.data);

                for (const comment of commentsData.comments) {
                    const normalized: z.infer<typeof CommentSchema> = {
                        id: comment.id,
                        file_key: comment.file_key,
                        ...(comment.parent_id && comment.parent_id !== '' && { parent_id: comment.parent_id }),
                        user_id: comment.user.id,
                        user_handle: comment.user.handle,
                        user_img_url: comment.user.img_url,
                        created_at: comment.created_at,
                        ...(comment.resolved_at != null && { resolved_at: comment.resolved_at }),
                        message: comment.message,
                        ...(comment.order_id != null && { order_id: comment.order_id }),
                        ...(comment.client_meta?.node_id && { node_id: comment.client_meta.node_id }),
                        ...(comment.client_meta?.node_offset?.x != null && { node_offset_x: comment.client_meta.node_offset.x }),
                        ...(comment.client_meta?.node_offset?.y != null && { node_offset_y: comment.client_meta.node_offset.y }),
                        reactions: comment.reactions
                    };
                    allComments.push(normalized);
                }
            }
        }

        if (allComments.length > 0) {
            await nango.batchSave(allComments, 'Comment');
        }

        await nango.trackDeletesEnd('Comment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
