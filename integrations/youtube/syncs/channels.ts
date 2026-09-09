import { createHash } from 'crypto';
import { createSync } from 'nango';
import { z } from 'zod';

// https://developers.google.com/youtube/v3/docs/channels#resource-representation
const ChannelSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    customUrl: z.string().optional(),
    publishedAt: z.string().optional(),
    thumbnailDefaultUrl: z.string().optional(),
    thumbnailMediumUrl: z.string().optional(),
    thumbnailHighUrl: z.string().optional(),
    viewCount: z.number().optional(),
    subscriberCount: z.number().optional(),
    hiddenSubscriberCount: z.boolean().optional(),
    videoCount: z.number().optional(),
    country: z.string().optional(),
    privacyStatus: z.string().optional(),
    isLinked: z.boolean().optional(),
    madeForKids: z.boolean().optional(),
    selfDeclaredMadeForKids: z.boolean().optional()
});

// Provider response schemas
const ChannelSnippetSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    customUrl: z.string().optional(),
    publishedAt: z.string().optional(),
    thumbnails: z
        .object({
            default: z
                .object({
                    url: z.string()
                })
                .optional(),
            medium: z
                .object({
                    url: z.string()
                })
                .optional(),
            high: z
                .object({
                    url: z.string()
                })
                .optional()
        })
        .optional(),
    country: z.string().optional()
});

const ChannelStatisticsSchema = z.object({
    viewCount: z.string().optional(),
    subscriberCount: z.string().optional(),
    hiddenSubscriberCount: z.boolean().optional(),
    videoCount: z.string().optional()
});

const ChannelContentDetailsSchema = z.object({
    relatedPlaylists: z
        .object({
            uploads: z.string().optional()
        })
        .optional()
});

const ChannelStatusSchema = z.object({
    privacyStatus: z.string().optional(),
    isLinked: z.boolean().optional(),
    madeForKids: z.boolean().optional(),
    selfDeclaredMadeForKids: z.boolean().optional()
});

const ChannelItemSchema = z.object({
    id: z.string(),
    snippet: ChannelSnippetSchema.optional(),
    statistics: ChannelStatisticsSchema.optional(),
    contentDetails: ChannelContentDetailsSchema.optional(),
    status: ChannelStatusSchema.optional()
});

const ChannelsListResponseSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    pageInfo: z
        .object({
            totalResults: z.number(),
            resultsPerPage: z.number()
        })
        .optional(),
    items: z.array(ChannelItemSchema),
    nextPageToken: z.string().optional()
});

type ChannelItem = z.infer<typeof ChannelItemSchema>;

const CheckpointSchema = z.object({
    phase: z.string(),
    page_token: z.string(),
    handle_index: z.number().int().nonnegative(),
    source_fingerprint: z.string()
});

const sync = createSync({
    description: 'Sync one or more YouTube channels in scope',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Channel: ChannelSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/channels'
        }
    ],
    checkpoint: CheckpointSchema,

    exec: async (nango) => {
        // Get channel identifiers from connection metadata or use defaults
        let metadata: { channelIds?: string[]; handles?: string[]; mine?: boolean } = {};
        // @allowTryCatch Metadata is optional; not all connections have metadata configured
        try {
            metadata = await nango.getMetadata<{ channelIds?: string[]; handles?: string[]; mine?: boolean }>();
        } catch {
            // No metadata available, use defaults
        }

        const channelIds = metadata?.channelIds;
        const handles = metadata?.handles;
        const mine = metadata?.mine ?? true;

        // Validate that we have at least one way to identify channels
        if (!mine && (!channelIds || channelIds.length === 0) && (!handles || handles.length === 0)) {
            await nango.log('No channel identifiers provided in metadata. Please provide channelIds, handles, or set mine=true', { level: 'error' });
            return;
        }

        function mapChannelItem(item: ChannelItem): z.infer<typeof ChannelSchema> {
            const snippet = item.snippet;
            const statistics = item.statistics;
            const status = item.status;

            return {
                id: item.id,
                ...(snippet?.title != null && { title: snippet.title }),
                ...(snippet?.description != null && { description: snippet.description }),
                ...(snippet?.customUrl != null && { customUrl: snippet.customUrl }),
                ...(snippet?.publishedAt != null && { publishedAt: snippet.publishedAt }),
                ...(snippet?.thumbnails?.default?.url != null && { thumbnailDefaultUrl: snippet.thumbnails.default.url }),
                ...(snippet?.thumbnails?.medium?.url != null && { thumbnailMediumUrl: snippet.thumbnails.medium.url }),
                ...(snippet?.thumbnails?.high?.url != null && { thumbnailHighUrl: snippet.thumbnails.high.url }),
                ...(statistics?.viewCount != null && { viewCount: parseInt(statistics.viewCount, 10) }),
                ...(statistics?.subscriberCount != null && { subscriberCount: parseInt(statistics.subscriberCount, 10) }),
                ...(statistics?.hiddenSubscriberCount != null && { hiddenSubscriberCount: statistics.hiddenSubscriberCount }),
                ...(statistics?.videoCount != null && { videoCount: parseInt(statistics.videoCount, 10) }),
                ...(snippet?.country != null && { country: snippet.country }),
                ...(status?.privacyStatus != null && { privacyStatus: status.privacyStatus }),
                ...(status?.isLinked != null && { isLinked: status.isLinked }),
                ...(status?.madeForKids != null && { madeForKids: status.madeForKids }),
                ...(status?.selfDeclaredMadeForKids != null && { selfDeclaredMadeForKids: status.selfDeclaredMadeForKids })
            };
        }

        // Read and validate checkpoint before constructing the first provider request
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = rawCheckpoint ? CheckpointSchema.safeParse(rawCheckpoint) : null;
        const sourceFingerprint = createHash('sha256')
            .update(JSON.stringify({ channelIds: channelIds ?? [], handles: handles ?? [], mine }))
            .digest('hex');
        const checkpoint = parsedCheckpoint?.success && parsedCheckpoint.data.source_fingerprint === sourceFingerprint ? parsedCheckpoint.data : null;

        if (rawCheckpoint != null && checkpoint == null) {
            await nango.log('The configured channel sources changed or the checkpoint is obsolete; restarting from the first source.', { level: 'warn' });
        }

        const shouldFetchIds = channelIds && channelIds.length > 0;
        const shouldFetchHandles = handles && handles.length > 0;
        const shouldFetchMine = mine;

        // Determine starting phase from checkpoint or default to ids
        let phase = checkpoint?.phase ?? 'ids';
        if (phase === 'ids' && !shouldFetchIds) {
            phase = shouldFetchHandles ? 'handles' : shouldFetchMine ? 'mine' : 'done';
        }
        if (phase === 'handles' && !shouldFetchHandles) {
            phase = shouldFetchMine ? 'mine' : 'done';
        }
        if (phase === 'mine' && !shouldFetchMine) {
            phase = 'done';
        }

        // Start delete tracking for full refresh
        await nango.trackDeletesStart('Channel');
        let checkpointSaved = false;
        const hadExistingCheckpoint = rawCheckpoint != null;

        // Fetch channels by ID with pagination resume
        if (phase === 'ids' && shouldFetchIds) {
            let pageToken = checkpoint?.phase === 'ids' ? checkpoint.page_token : undefined;

            while (true) {
                // https://developers.google.com/youtube/v3/docs/channels/list
                const idResponse = await nango.get({
                    endpoint: '/youtube/v3/channels',
                    params: {
                        part: 'snippet,statistics,status',
                        id: channelIds.join(','),
                        maxResults: '50',
                        ...(pageToken && { pageToken })
                    },
                    retries: 3
                });

                const parsedIdResponse = ChannelsListResponseSchema.safeParse(idResponse.data);

                if (!parsedIdResponse.success) {
                    await nango.log('Failed to parse channels response by ID', { level: 'error', error: parsedIdResponse.error.message });
                    throw new Error('Failed to parse channels response');
                }

                const items = parsedIdResponse.data.items;
                if (items.length > 0) {
                    await nango.batchSave(items.map(mapChannelItem), 'Channel');
                }

                const nextPageToken = parsedIdResponse.data.nextPageToken;
                if (typeof nextPageToken === 'string' && nextPageToken.length > 0) {
                    await nango.saveCheckpoint({ phase: 'ids', page_token: nextPageToken, handle_index: 0, source_fingerprint: sourceFingerprint });
                    checkpointSaved = true;
                    pageToken = nextPageToken;
                    continue;
                }

                break;
            }

            // Save checkpoint for the next phase so completed work is not repeated
            if (shouldFetchHandles) {
                await nango.saveCheckpoint({ phase: 'handles', page_token: '', handle_index: 0, source_fingerprint: sourceFingerprint });
                checkpointSaved = true;
            } else if (shouldFetchMine) {
                await nango.saveCheckpoint({ phase: 'mine', page_token: '', handle_index: 0, source_fingerprint: sourceFingerprint });
                checkpointSaved = true;
            }

            phase = shouldFetchHandles ? 'handles' : shouldFetchMine ? 'mine' : 'done';
        }

        // Fetch channels by handle with pagination resume
        if (phase === 'handles' && shouldFetchHandles) {
            const handleIndex = checkpoint?.phase === 'handles' ? (checkpoint.handle_index ?? 0) : 0;

            for (let i = handleIndex; i < handles.length; i++) {
                const handle = handles[i];
                if (typeof handle !== 'string') {
                    continue;
                }
                let pageToken = checkpoint?.phase === 'handles' && checkpoint.handle_index === i ? checkpoint.page_token : undefined;

                while (true) {
                    // https://developers.google.com/youtube/v3/docs/channels/list
                    const handleResponse = await nango.get({
                        endpoint: '/youtube/v3/channels',
                        params: {
                            part: 'snippet,statistics,status',
                            forHandle: handle.startsWith('@') ? handle : `@${handle}`,
                            maxResults: '5',
                            ...(pageToken && { pageToken })
                        },
                        retries: 3
                    });

                    const parsedHandleResponse = ChannelsListResponseSchema.safeParse(handleResponse.data);

                    if (!parsedHandleResponse.success) {
                        await nango.log('Failed to parse channels response by handle', { level: 'error', error: parsedHandleResponse.error.message });
                        throw new Error('Failed to parse channels response');
                    }

                    const items = parsedHandleResponse.data.items;
                    if (items.length > 0) {
                        await nango.batchSave(items.map(mapChannelItem), 'Channel');
                    }

                    const nextPageToken = parsedHandleResponse.data.nextPageToken;
                    if (typeof nextPageToken === 'string' && nextPageToken.length > 0) {
                        await nango.saveCheckpoint({
                            phase: 'handles',
                            handle_index: i,
                            page_token: nextPageToken,
                            source_fingerprint: sourceFingerprint
                        });
                        checkpointSaved = true;
                        pageToken = nextPageToken;
                        continue;
                    }

                    break;
                }

                // Save checkpoint for the next handle or the next phase
                if (i + 1 < handles.length) {
                    await nango.saveCheckpoint({ phase: 'handles', page_token: '', handle_index: i + 1, source_fingerprint: sourceFingerprint });
                    checkpointSaved = true;
                } else if (shouldFetchMine) {
                    await nango.saveCheckpoint({ phase: 'mine', page_token: '', handle_index: 0, source_fingerprint: sourceFingerprint });
                    checkpointSaved = true;
                }
            }

            phase = shouldFetchMine ? 'mine' : 'done';
        }

        // Fetch the authenticated user's channel(s) with pagination resume
        if (phase === 'mine' && shouldFetchMine) {
            let pageToken = checkpoint?.phase === 'mine' ? checkpoint.page_token : undefined;

            while (true) {
                // https://developers.google.com/youtube/v3/docs/channels/list
                const mineResponse = await nango.get({
                    endpoint: '/youtube/v3/channels',
                    params: {
                        part: 'snippet,statistics,status',
                        mine: 'true',
                        maxResults: '5',
                        ...(pageToken && { pageToken })
                    },
                    retries: 3
                });

                const parsedMineResponse = ChannelsListResponseSchema.safeParse(mineResponse.data);

                if (!parsedMineResponse.success) {
                    await nango.log('Failed to parse channels response for mine=true', { level: 'error', error: parsedMineResponse.error.message });
                    throw new Error('Failed to parse channels response');
                }

                const items = parsedMineResponse.data.items;
                if (items.length > 0) {
                    await nango.batchSave(items.map(mapChannelItem), 'Channel');
                }

                const nextPageToken = parsedMineResponse.data.nextPageToken;
                if (typeof nextPageToken === 'string' && nextPageToken.length > 0) {
                    await nango.saveCheckpoint({ phase: 'mine', page_token: nextPageToken, handle_index: 0, source_fingerprint: sourceFingerprint });
                    checkpointSaved = true;
                    pageToken = nextPageToken;
                    continue;
                }

                break;
            }
        }

        // Clear the checkpoint only after the last page has been saved,
        // then close the delete-tracking window opened by trackDeletesStart().
        if (checkpointSaved || hadExistingCheckpoint) {
            await nango.clearCheckpoint();
        }
        await nango.trackDeletesEnd('Channel');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
