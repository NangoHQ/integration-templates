import { createSync } from 'nango';
import { z } from 'zod';

const CommentSnippetSchema = z.object({
    authorDisplayName: z.string(),
    authorChannelId: z.object({ value: z.string() }).optional(),
    authorChannelUrl: z.string().optional(),
    authorProfileImageUrl: z.string().optional(),
    textOriginal: z.string(),
    textDisplay: z.string(),
    parentId: z.string().optional(),
    canRate: z.boolean().optional(),
    viewerRating: z.string().optional(),
    likeCount: z.number().int(),
    publishedAt: z.string(),
    updatedAt: z.string(),
    videoId: z.string().optional()
});

const CommentSchema = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    snippet: CommentSnippetSchema
});

const CommentThreadSnippetSchema = z.object({
    videoId: z.string(),
    channelId: z.string().optional(),
    topLevelComment: CommentSchema,
    canReply: z.boolean().optional(),
    totalReplyCount: z.number().int(),
    isPublic: z.boolean().optional()
});

const CommentThreadRepliesSchema = z.object({
    comments: z.array(CommentSchema).optional()
});

const ProviderCommentThreadSchema = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    snippet: CommentThreadSnippetSchema,
    replies: CommentThreadRepliesSchema.optional()
});

const CommentAuthorOutputSchema = z.object({
    channelId: z.string().optional(),
    displayName: z.string(),
    profileImageUrl: z.string().optional(),
    channelUrl: z.string().optional()
});

const CommentOutputSchema = z.object({
    id: z.string(),
    author: CommentAuthorOutputSchema,
    textOriginal: z.string(),
    textDisplay: z.string(),
    likeCount: z.number().int(),
    publishedAt: z.string(),
    updatedAt: z.string(),
    parentId: z.string().optional()
});

const CommentThreadSchema = z.object({
    id: z.string(),
    videoId: z.string(),
    channelId: z.string().optional(),
    topLevelComment: CommentOutputSchema,
    replies: z.array(CommentOutputSchema),
    totalReplyCount: z.number().int(),
    canReply: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    etag: z.string()
});

const MetadataSchema = z.object({
    videoId: z.string().optional(),
    channelId: z.string().optional(),
    videoIds: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    target_type: z.string(),
    target_id: z.string(),
    target_index: z.number().int().nonnegative(),
    page_token: z.string()
});

function mapCommentAuthor(snippet: z.infer<typeof CommentSnippetSchema>): z.infer<typeof CommentAuthorOutputSchema> {
    return {
        channelId: snippet.authorChannelId?.value,
        displayName: snippet.authorDisplayName,
        profileImageUrl: snippet.authorProfileImageUrl,
        channelUrl: snippet.authorChannelUrl
    };
}

function mapComment(comment: z.infer<typeof CommentSchema>): z.infer<typeof CommentOutputSchema> {
    const snippet = comment.snippet;
    return {
        id: comment.id,
        author: mapCommentAuthor(snippet),
        textOriginal: snippet.textOriginal,
        textDisplay: snippet.textDisplay,
        likeCount: snippet.likeCount,
        publishedAt: snippet.publishedAt,
        updatedAt: snippet.updatedAt,
        parentId: snippet.parentId
    };
}

function mapCommentThread(thread: z.infer<typeof ProviderCommentThreadSchema>): z.infer<typeof CommentThreadSchema> {
    const snippet = thread.snippet;
    const topLevelComment = mapComment(snippet.topLevelComment);
    const replyComments = thread.replies?.comments?.map(mapComment) ?? [];

    return {
        id: thread.id,
        videoId: snippet.videoId,
        channelId: snippet.channelId,
        topLevelComment,
        replies: replyComments,
        totalReplyCount: snippet.totalReplyCount,
        canReply: snippet.canReply,
        isPublic: snippet.isPublic,
        etag: thread.etag
    };
}

const sync = createSync({
    description: 'Sync comment threads for YouTube videos or channels in scope',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CommentThread: CommentThreadSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/comment-threads'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = rawCheckpoint ? CheckpointSchema.safeParse(rawCheckpoint) : null;
        const checkpoint = parsedCheckpoint?.success ? parsedCheckpoint.data : null;
        let metadataResult: unknown = {};
        // @allowTryCatch Metadata is optional and may be absent in local dryruns.
        try {
            metadataResult = (await nango.getMetadata()) ?? {};
        } catch {
            metadataResult = {};
        }
        const metadata = MetadataSchema.safeParse(metadataResult ?? {});

        if (!metadata.success) {
            throw new Error('Invalid metadata: ' + metadata.error.message);
        }

        const { videoId, channelId, videoIds } = metadata.data ?? {};

        // Blocker: YouTube Data API v3 commentThreads.list does not support
        // filtering by modification time or a changed-since parameter.
        // It only supports videoId, channelId, and pagination via pageToken.
        // Therefore, we must perform a full refresh with trackDeletesStart/trackDeletesEnd.

        // Determine which IDs to fetch comment threads for
        const idsToFetch: Array<{ type: 'video' | 'channel'; id: string }> = [];

        if (videoIds && videoIds.length > 0) {
            for (const id of videoIds) {
                idsToFetch.push({ type: 'video', id });
            }
        } else if (videoId) {
            idsToFetch.push({ type: 'video', id: videoId });
        } else if (channelId) {
            idsToFetch.push({ type: 'channel', id: channelId });
        } else {
            await nango.log('No videoId, channelId, or videoIds found in metadata. Configure sync scope in connection metadata.', { level: 'warn' });
            return;
        }

        let startTargetIndex = 0;
        let startPageToken: string | undefined;

        if (checkpoint) {
            const checkpointTarget = idsToFetch[checkpoint.target_index];

            if (checkpointTarget && checkpointTarget.id === checkpoint.target_id && checkpointTarget.type === checkpoint.target_type) {
                startTargetIndex = checkpoint.target_index;
                startPageToken = checkpoint.page_token.length > 0 ? checkpoint.page_token : undefined;
            }
        }

        await nango.trackDeletesStart('CommentThread');
        let syncSuccessful = false;
        let checkpointSaved = false;
        const hadExistingCheckpoint = checkpoint !== null;
        try {
            // Process each video/channel
            for (let targetIndex = startTargetIndex; targetIndex < idsToFetch.length; targetIndex++) {
                const target = idsToFetch[targetIndex];
                if (!target) {
                    continue;
                }
                let currentPageToken = targetIndex === startTargetIndex ? startPageToken : undefined;

                while (true) {
                    const params: Record<string, string | number> = {
                        part: 'snippet,replies',
                        maxResults: 100
                    };

                    if (target.type === 'video') {
                        params['videoId'] = target.id;
                    } else {
                        params['allThreadsRelatedToChannelId'] = target.id;
                    }

                    if (currentPageToken) {
                        params['pageToken'] = currentPageToken;
                    }

                    const response = await nango.get({
                        // https://developers.google.com/youtube/v3/docs/commentThreads/list
                        endpoint: '/youtube/v3/commentThreads',
                        params,
                        retries: 3
                    });

                    const parsedResponse = z
                        .object({
                            items: z.array(ProviderCommentThreadSchema),
                            nextPageToken: z.string().optional()
                        })
                        .safeParse(response.data);

                    if (!parsedResponse.success) {
                        throw new Error('Invalid response from YouTube API: ' + parsedResponse.error.message);
                    }

                    const threads = parsedResponse.data.items.map(mapCommentThread);

                    if (threads.length > 0) {
                        await nango.batchSave(threads, 'CommentThread');
                    }

                    const nextPageToken = parsedResponse.data.nextPageToken;
                    if (nextPageToken) {
                        currentPageToken = nextPageToken;
                        await nango.saveCheckpoint({
                            target_type: target.type,
                            target_id: target.id,
                            target_index: targetIndex,
                            page_token: nextPageToken
                        });
                        checkpointSaved = true;
                        continue;
                    }

                    const nextTarget = idsToFetch[targetIndex + 1];
                    if (nextTarget) {
                        await nango.saveCheckpoint({
                            target_type: nextTarget.type,
                            target_id: nextTarget.id,
                            target_index: targetIndex + 1,
                            page_token: ''
                        });
                        checkpointSaved = true;
                    }

                    break;
                }
            }
            syncSuccessful = true;
        } finally {
            if (syncSuccessful && (checkpointSaved || hadExistingCheckpoint)) {
                await nango.clearCheckpoint();
            }
            await nango.trackDeletesEnd('CommentThread');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
