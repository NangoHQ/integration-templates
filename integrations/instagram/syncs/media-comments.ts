import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MediaCommentSchema = z
    .object({
        id: z.string().describe('Unique identifier for the Instagram comment.'),
        media_id: z.string().describe('Identifier of the Instagram media item the comment belongs to.'),
        parent_id: z.string().optional().describe('Identifier of the parent comment when this comment is a reply. Omitted for top-level comments.'),
        text: z.string().optional().describe('Text content of the comment.'),
        timestamp: z.string().optional().describe('ISO 8601 timestamp indicating when the comment was created.'),
        username: z.string().optional().describe('Username of the Instagram account that authored the comment.'),
        like_count: z.number().optional().describe('Number of likes the comment has received.'),
        hidden: z.boolean().optional().describe('Whether the comment is currently hidden.')
    })
    .describe('An Instagram comment or reply posted on a media item.');

const CheckpointSchema = z
    .object({
        media_after: z
            .string()
            .describe('Pagination cursor for the media list page that is currently being processed; empty when the first page is being processed.'),
        media_index: z.number().int().nonnegative().describe('Index of the next media item to process within the current media list page.'),
        media_id: z.string().describe('Identifier of the media item whose comments were partially paginated; empty when no media item is in progress.'),
        comments_after: z
            .string()
            .describe('Pagination cursor for the next page of comments on the media item identified by media_id; empty when no comment page is in progress.')
    })
    .describe('Resume state for walking Instagram media items and their comments.');

const StoredCheckpointSchema = z.object({
    media_after: z.string().nullish(),
    media_index: z.number().int().nonnegative().nullish(),
    media_id: z.string().nullish(),
    comments_after: z.string().nullish()
});

const MediaItemSchema = z.object({
    id: z.string(),
    comments_count: z.number().nullish()
});

const PagingSchema = z
    .object({
        next: z.string().nullish(),
        cursors: z
            .object({
                after: z.string().nullish()
            })
            .nullish()
    })
    .nullish();

const MediaListResponseSchema = z.object({
    data: z.array(MediaItemSchema),
    paging: PagingSchema
});

const CommentReplySchema = z.object({
    id: z.string(),
    text: z.string().nullish(),
    timestamp: z.string().nullish(),
    username: z.string().nullish(),
    like_count: z.number().nullish(),
    parent_id: z.string().nullish(),
    hidden: z.boolean().nullish()
});

const CommentSchema = CommentReplySchema.extend({
    replies: z
        .object({
            data: z.array(CommentReplySchema),
            paging: PagingSchema
        })
        .nullish()
});

const CommentsResponseSchema = z.object({
    data: z.array(CommentSchema),
    paging: PagingSchema
});

type MediaItem = z.infer<typeof MediaItemSchema>;
type Comment = z.infer<typeof CommentSchema>;
type CommentReply = z.infer<typeof CommentReplySchema>;
type MediaComment = z.infer<typeof MediaCommentSchema>;

function getAfterCursor(paging: z.infer<typeof PagingSchema>, currentPageSize: number): string | undefined {
    if (paging?.next) {
        const queryStart = paging.next.indexOf('?');

        if (queryStart !== -1) {
            const query = paging.next.slice(queryStart + 1).split('#')[0] ?? '';
            const after = new URLSearchParams(query).get('after');

            if (after) {
                return after;
            }
        }
    }

    // Saved Instagram mocks expose usable cursors under paging.cursors.after even when
    // paging.next is absent. Only follow them after non-empty pages so empty-edge gotchas
    // still terminate cleanly.
    return currentPageSize > 0 ? paging?.cursors?.after || undefined : undefined;
}

function buildCheckpoint(mediaAfter: string | undefined, mediaIndex: number, mediaId?: string, commentsAfter?: string): z.infer<typeof CheckpointSchema> {
    return {
        media_after: mediaAfter ?? '',
        media_index: mediaIndex,
        media_id: mediaId ?? '',
        comments_after: commentsAfter ?? ''
    };
}

function toCommentRecord(comment: Comment | CommentReply, mediaId: string, fallbackParentId?: string): MediaComment {
    const parentId = comment.parent_id ?? fallbackParentId;

    return {
        id: comment.id,
        media_id: mediaId,
        ...(parentId != null && { parent_id: parentId }),
        ...(comment.text != null && { text: comment.text }),
        ...(comment.timestamp != null && { timestamp: comment.timestamp }),
        ...(comment.username != null && { username: comment.username }),
        ...(comment.like_count != null && { like_count: comment.like_count }),
        ...(comment.hidden != null && { hidden: comment.hidden })
    };
}

function flattenComments(comments: Comment[], mediaId: string): MediaComment[] {
    const records: MediaComment[] = [];

    for (const comment of comments) {
        records.push(toCommentRecord(comment, mediaId));

        for (const reply of comment.replies?.data ?? []) {
            records.push(toCommentRecord(reply, mediaId, comment.id));
        }
    }

    return records;
}

const REPLY_FIELDS = 'id,text,timestamp,username,like_count,parent_id,hidden';

const sync = createSync({
    description: 'Sync comments for Instagram media items in scope.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        MediaComment: MediaCommentSchema
    },
    scopes: ['instagram_business_basic', 'instagram_business_manage_comments'],

    exec: async (nango) => {
        // Blocker: Instagram's media comments edge cannot be filtered by timestamp and exposes no
        // deleted-comments feed, so this sync must walk every media item and every comment page.
        // The confirmed live gotcha (comments authored by the media owner are counted by
        // comments_count but never returned by the comments edge) also makes automatic deletion
        // detection unsafe, so records are only upserted and never delete-tracked.
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint == null ? undefined : StoredCheckpointSchema.parse(rawCheckpoint);

        let mediaAfter: string | undefined = checkpoint?.media_after || undefined;
        let mediaIndex = checkpoint?.media_index ?? 0;
        let currentMediaId: string | undefined = checkpoint?.media_id || undefined;
        let currentCommentsAfter: string | undefined = checkpoint?.comments_after || undefined;
        let mediaHasMore = true;
        let checkpointSaved = false;

        const saveCheckpoint = async (state: z.infer<typeof CheckpointSchema>) => {
            await nango.saveCheckpoint(state);
            checkpointSaved = true;
        };

        while (mediaHasMore) {
            const mediaConfig: ProxyConfiguration = {
                // https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media
                endpoint: '/me/media',
                params: {
                    fields: 'id,comments_count',
                    limit: 50,
                    ...(mediaAfter && { after: mediaAfter })
                },
                retries: 3
            };

            const mediaResponse = MediaListResponseSchema.parse((await nango.get(mediaConfig)).data);
            const mediaItems: MediaItem[] = mediaResponse.data;

            for (let index = mediaIndex; index < mediaItems.length; index++) {
                const media = mediaItems[index];

                if (!media) {
                    continue;
                }

                let commentsAfter = currentMediaId === media.id ? currentCommentsAfter : undefined;
                let commentsHaveMore = true;

                while (commentsHaveMore) {
                    const commentsConfig: ProxyConfiguration = {
                        // https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/comments
                        endpoint: `/${encodeURIComponent(media.id)}/comments`,
                        params: {
                            fields: `${REPLY_FIELDS},replies{${REPLY_FIELDS}}`,
                            limit: 50,
                            ...(commentsAfter && { after: commentsAfter })
                        },
                        retries: 3
                    };

                    const commentsResponse = CommentsResponseSchema.parse((await nango.get(commentsConfig)).data);
                    const records = flattenComments(commentsResponse.data, media.id);

                    if (records.length > 0) {
                        await nango.batchSave(records, 'MediaComment');
                    }

                    // The expanded replies connection only holds its first page; fetch the rest per comment.
                    for (const comment of commentsResponse.data) {
                        const repliesAfter = comment.replies ? getAfterCursor(comment.replies.paging, comment.replies.data.length) : undefined;

                        if (!comment.replies?.paging?.next || !repliesAfter) {
                            continue;
                        }

                        const repliesConfig: ProxyConfiguration = {
                            // https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-comment/replies
                            endpoint: `/${encodeURIComponent(comment.id)}/replies`,
                            params: {
                                fields: REPLY_FIELDS,
                                after: repliesAfter
                            },
                            paginate: {
                                type: 'cursor',
                                cursor_name_in_request: 'after',
                                cursor_path_in_response: 'paging.cursors.after',
                                response_path: 'data',
                                limit_name_in_request: 'limit',
                                limit: 50
                            },
                            retries: 3
                        };

                        for await (const page of nango.paginate<unknown>(repliesConfig)) {
                            const replies = z.array(CommentReplySchema).parse(page);
                            const replyRecords = replies.map((reply) => toCommentRecord(reply, media.id, comment.id));

                            if (replyRecords.length > 0) {
                                await nango.batchSave(replyRecords, 'MediaComment');
                            }
                        }
                    }

                    const nextCommentsAfter = getAfterCursor(commentsResponse.paging, commentsResponse.data.length);

                    if (!nextCommentsAfter || nextCommentsAfter === commentsAfter) {
                        commentsHaveMore = false;
                    } else {
                        commentsAfter = nextCommentsAfter;
                        currentMediaId = media.id;
                        currentCommentsAfter = commentsAfter;

                        await saveCheckpoint(buildCheckpoint(mediaAfter, index, media.id, commentsAfter));
                    }
                }

                const nextMediaIndex = index + 1;
                currentMediaId = undefined;
                currentCommentsAfter = undefined;

                if (nextMediaIndex < mediaItems.length) {
                    await saveCheckpoint(buildCheckpoint(mediaAfter, nextMediaIndex));
                }
            }

            const nextMediaAfter = getAfterCursor(mediaResponse.paging, mediaItems.length);

            if (!nextMediaAfter || nextMediaAfter === mediaAfter) {
                mediaHasMore = false;
            } else {
                mediaAfter = nextMediaAfter;
                mediaIndex = 0;
                currentMediaId = undefined;
                currentCommentsAfter = undefined;

                await saveCheckpoint(buildCheckpoint(mediaAfter, 0));
            }
        }

        // Deleting a checkpoint that was never written (e.g. a single-page run starting from
        // scratch) fails with checkpoint_conflict.
        if (rawCheckpoint != null || checkpointSaved) {
            await nango.clearCheckpoint();
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
