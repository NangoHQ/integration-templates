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
    file_keys: z.array(z.string()).optional(),
    team_id: z.string().optional()
});

function normalizeComments(fileKey: string, comments: z.infer<typeof ProviderCommentSchema>[]): z.infer<typeof CommentSchema>[] {
    return comments.map((comment) => ({
        id: comment.id,
        file_key: comment.file_key || fileKey,
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
    }));
}

async function fetchCommentsForFile(nango: NangoSyncLocal, fileKey: string): Promise<z.infer<typeof CommentSchema>[]> {
    // https://www.figma.com/developers/api#get-comments-endpoint
    const commentsResponse = await nango.get({
        endpoint: `/v1/files/${encodeURIComponent(fileKey)}/comments`,
        retries: 3
    });

    const commentsData = GetCommentsResponseSchema.parse(commentsResponse.data);
    return normalizeComments(fileKey, commentsData.comments);
}

const FILE_COMMENTS_FETCH_CONCURRENCY = 5;

async function fetchCommentsForFiles(nango: NangoSyncLocal, fileKeys: string[]): Promise<z.infer<typeof CommentSchema>[]> {
    const allComments: z.infer<typeof CommentSchema>[] = [];

    // Bounded concurrency: fetching every configured file at once risks tripping Figma's rate limits.
    for (let i = 0; i < fileKeys.length; i += FILE_COMMENTS_FETCH_CONCURRENCY) {
        const batch = fileKeys.slice(i, i + FILE_COMMENTS_FETCH_CONCURRENCY);
        const batchResults = await Promise.all(batch.map((fileKey) => fetchCommentsForFile(nango, fileKey)));
        allComments.push(...batchResults.flat());
    }

    return allComments;
}

async function fetchCommentsByTeamDiscovery(nango: NangoSyncLocal, teamId: string): Promise<z.infer<typeof CommentSchema>[]> {
    // https://developers.figma.com/docs/rest-api/folders-endpoints/#get-team-folders-endpoint
    const foldersResponse = await nango.get({
        endpoint: `/v2/teams/${encodeURIComponent(teamId)}/folders`,
        retries: 3
    });

    const foldersData = GetTeamFoldersResponseSchema.parse(foldersResponse.data);
    const allComments: z.infer<typeof CommentSchema>[] = [];

    // Team-folders only returns top-level folders; subfolders must be walked
    // explicitly via GET /v2/folders/:folder_id/folders or their files are missed.
    const folderQueue: string[] = foldersData.folders.map((folder) => folder.id);

    while (folderQueue.length > 0) {
        const folderId = folderQueue.shift()!;

        // https://developers.figma.com/docs/rest-api/folders-endpoints/#get-folder-files-endpoint
        const filesResponse = await nango.get({
            endpoint: `/v2/folders/${encodeURIComponent(folderId)}/files`,
            retries: 3
        });

        const filesData = GetFolderFilesResponseSchema.parse(filesResponse.data);

        for (const file of filesData.files) {
            allComments.push(...(await fetchCommentsForFile(nango, file.key)));
        }

        // https://developers.figma.com/docs/rest-api/folders-endpoints/#get-folder-folders-endpoint
        const subfoldersResponse = await nango.get({
            endpoint: `/v2/folders/${encodeURIComponent(folderId)}/folders`,
            retries: 3
        });

        const subfoldersData = GetTeamFoldersResponseSchema.parse(subfoldersResponse.data);
        for (const subfolder of subfoldersData.folders) {
            folderQueue.push(subfolder.id);
        }
    }

    return allComments;
}

const sync = createSync({
    description: 'Sync comments from Figma',
    version: '1.3.0',
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
    scopes: ['projects:read', 'file_comments:read'],

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
        let fileKeys = metadata?.file_keys;
        let teamId = metadata?.team_id;

        if (!fileKeys?.length) {
            const connection = await nango.getConnection();
            const connectionMetadata = connection.metadata ?? {};
            const connectionMetadataFileKeys = connectionMetadata['file_keys'];
            const connectionConfigFileKeys = connection.connection_config?.['file_keys'];
            const connectionMetadataTeamId = connectionMetadata['team_id'];

            if (Array.isArray(connectionMetadataFileKeys) && connectionMetadataFileKeys.every((key) => typeof key === 'string')) {
                fileKeys = connectionMetadataFileKeys;
            } else if (Array.isArray(connectionConfigFileKeys) && connectionConfigFileKeys.every((key) => typeof key === 'string')) {
                fileKeys = connectionConfigFileKeys;
            }

            if (!teamId && typeof connectionMetadataTeamId === 'string') {
                teamId = connectionMetadataTeamId;
            }
        }

        if (!fileKeys?.length && !teamId) {
            throw new Error('file_keys or team_id is required in metadata or connection configuration');
        }

        // Blocker: Figma Comments API does not support modified_since, updated_after,
        // cursors, or pagination parameters. We must perform a full refresh.
        await nango.trackDeletesStart('Comment');

        const allComments: z.infer<typeof CommentSchema>[] = fileKeys?.length
            ? await fetchCommentsForFiles(nango, fileKeys)
            : await fetchCommentsByTeamDiscovery(nango, teamId!);

        if (allComments.length > 0) {
            await nango.batchSave(allComments, 'Comment');
        }

        await nango.trackDeletesEnd('Comment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
