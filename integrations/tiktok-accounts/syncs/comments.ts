import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CommentSchema = z.object({
    id: z.string(),
    video_id: z.string(),
    text: z.string().optional(),
    username: z.string().optional(),
    user_id: z.string().optional(),
    status: z.string().optional(),
    create_time: z.string().optional(),
    likes: z.number().optional(),
    replies: z.number().optional(),
    profile_image: z.string().optional(),
    pinned: z.boolean().optional()
});

const CursorSchema = z.union([z.string(), z.number()]);

const CheckpointSchema = z.object({
    start_time: z.string(),
    end_time: z.string(),
    remaining_video_ids_json: z.string(),
    cursor: z.string(),
    max_create_time: z.string()
});

const CommentItemSchema = z
    .object({
        comment_id: z.string().optional(),
        video_id: z.string().optional(),
        text: z.string().optional(),
        username: z.string().optional(),
        user_id: z.string().optional(),
        status: z.string().optional(),
        create_time: z.string().optional(),
        likes: z.number().optional(),
        replies: z.number().optional(),
        profile_image: z.string().optional(),
        pinned: z.boolean().optional()
    })
    .passthrough();

const CommentListResponseSchema = z
    .object({
        data: z
            .object({
                list: z.array(z.unknown()).optional(),
                cursor: CursorSchema.optional()
            })
            .optional()
    })
    .passthrough();

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function normalizeCursor(cursor: z.infer<typeof CursorSchema> | undefined): string | undefined {
    if (typeof cursor === 'string') {
        const trimmed = cursor.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    return typeof cursor === 'number' ? String(cursor) : undefined;
}

function parseRemainingVideoIds(serialized: string): string[] | undefined {
    if (!serialized) {
        return undefined;
    }

    try {
        const parsed = z.array(z.string()).safeParse(JSON.parse(serialized));
        return parsed.success ? parsed.data : undefined;
    } catch {
        return undefined;
    }
}

function buildCheckpoint(
    startTime: string,
    {
        endTime = '',
        remainingVideoIds = [],
        cursor = '',
        maxCreateTime = ''
    }: {
        endTime?: string;
        remainingVideoIds?: string[];
        cursor?: string;
        maxCreateTime?: string;
    } = {}
): z.infer<typeof CheckpointSchema> {
    return {
        start_time: startTime,
        end_time: endTime,
        remaining_video_ids_json: JSON.stringify(remainingVideoIds),
        cursor,
        max_create_time: maxCreateTime
    };
}

const sync = createSync({
    description: 'Sync comments on business-owned TikTok videos for moderation and analytics.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    checkpoint: CheckpointSchema,
    models: {
        Comment: CommentSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/comments' }],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const now = new Date();
        const defaultStartTime = formatDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
        const startTime = checkpoint?.start_time ?? defaultStartTime;
        let endTime = checkpoint?.end_time || undefined;
        let remainingVideoIds = checkpoint ? parseRemainingVideoIds(checkpoint.remaining_video_ids_json) : undefined;
        let cursor = checkpoint?.cursor || undefined;
        let maxCreateTime = checkpoint?.max_create_time || startTime;

        const connection = await nango.getConnection();
        const advertiserId =
            typeof connection['connection_config']?.['advertiser_id'] === 'string'
                ? connection['connection_config']['advertiser_id']
                : typeof connection['metadata']?.['advertiser_id'] === 'string'
                  ? connection['metadata']['advertiser_id']
                  : '7644117588953235464';

        if (!endTime || !remainingVideoIds) {
            endTime = formatDate(now);

            const videoIds = new Set<string>();

            const adProxyConfig: ProxyConfiguration = {
                // https://business-api.tiktok.com/portal/docs?id=1735735588640770
                endpoint: '/ad/get/',
                params: {
                    advertiser_id: advertiserId,
                    page: 1,
                    page_size: 100
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: 1,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'page_size',
                    limit: 100,
                    response_path: 'data.list'
                },
                retries: 3
            };

            for await (const adBatch of nango.paginate(adProxyConfig)) {
                for (const item of adBatch) {
                    const parsed = z.object({ video_id: z.string().optional() }).passthrough().safeParse(item);
                    if (parsed.success && parsed.data.video_id) {
                        videoIds.add(parsed.data.video_id);
                    }
                }
            }

            remainingVideoIds = Array.from(videoIds);
        }

        if (remainingVideoIds.length === 0) {
            await nango.saveCheckpoint(buildCheckpoint(maxCreateTime));
            await nango.log('No videos found for advertiser');
            return;
        }

        while (remainingVideoIds.length > 0) {
            const videoId = remainingVideoIds[0]!;
            let nextCursor = cursor;

            while (true) {
                const response = await nango.get({
                    // https://business-api.tiktok.com/portal/docs?id=1738086301876225
                    endpoint: '/comment/list/',
                    params: {
                        advertiser_id: advertiserId,
                        start_time: startTime,
                        end_time: endTime,
                        search_field: 'VIDEO_ID',
                        search_value: videoId,
                        sort_field: 'CREATE_TIME',
                        sort_type: 'ASC',
                        page_size: 5,
                        ...(nextCursor !== undefined && { cursor: nextCursor })
                    },
                    retries: 3
                });

                const parsedResponse = CommentListResponseSchema.safeParse(response.data);
                const commentBatch = parsedResponse.success ? (parsedResponse.data.data?.list ?? []) : [];
                const responseCursor = normalizeCursor(parsedResponse.success ? parsedResponse.data.data?.cursor : undefined);

                const comments: Array<z.infer<typeof CommentSchema>> = [];

                for (const item of commentBatch) {
                    const parsed = CommentItemSchema.safeParse(item);
                    if (!parsed.success) {
                        continue;
                    }

                    const data = parsed.data;
                    comments.push({
                        id: data.comment_id ?? '',
                        video_id: data.video_id ?? '',
                        ...(data.text !== undefined && { text: data.text }),
                        ...(data.username !== undefined && { username: data.username }),
                        ...(data.user_id !== undefined && { user_id: data.user_id }),
                        ...(data.status !== undefined && { status: data.status }),
                        ...(data.create_time !== undefined && { create_time: data.create_time }),
                        ...(data.likes !== undefined && { likes: data.likes }),
                        ...(data.replies !== undefined && { replies: data.replies }),
                        ...(data.profile_image !== undefined && { profile_image: data.profile_image }),
                        ...(data.pinned !== undefined && { pinned: data.pinned })
                    });

                    if (data.create_time && data.create_time > maxCreateTime) {
                        maxCreateTime = data.create_time;
                    }
                }

                if (comments.length > 0) {
                    await nango.batchSave(comments, 'Comment');
                }

                await nango.saveCheckpoint(
                    buildCheckpoint(startTime, {
                        endTime,
                        remainingVideoIds,
                        cursor: responseCursor ?? '',
                        maxCreateTime: maxCreateTime !== startTime ? maxCreateTime : ''
                    })
                );

                if (responseCursor === undefined) {
                    break;
                }

                nextCursor = responseCursor;
            }

            remainingVideoIds = remainingVideoIds.slice(1);
            cursor = undefined;

            if (remainingVideoIds.length > 0) {
                await nango.saveCheckpoint(
                    buildCheckpoint(startTime, {
                        endTime,
                        remainingVideoIds,
                        maxCreateTime: maxCreateTime !== startTime ? maxCreateTime : ''
                    })
                );
            }
        }

        await nango.saveCheckpoint(buildCheckpoint(maxCreateTime));
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
