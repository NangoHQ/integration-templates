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
    privacyStatus: z.string().optional(),
    isLinked: z.boolean().optional()
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
    items: z.array(ChannelItemSchema)
});

type ChannelItem = z.infer<typeof ChannelItemSchema>;

const sync = createSync({
    description: 'Sync one or more YouTube channels in scope',
    version: '1.0.0',
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

        await nango.trackDeletesStart('Channel');

        const allChannels: Array<z.infer<typeof ChannelSchema>> = [];

        // Fetch channels by ID
        if (channelIds && channelIds.length > 0) {
            // https://developers.google.com/youtube/v3/docs/channels/list
            const idResponse = await nango.get({
                endpoint: '/youtube/v3/channels',
                params: {
                    part: 'contentDetails,snippet,statistics,brandingSettings',
                    id: channelIds.join(','),
                    maxResults: '50'
                },
                retries: 3
            });

            const parsedIdResponse = ChannelsListResponseSchema.safeParse(idResponse.data);

            if (!parsedIdResponse.success) {
                await nango.log('Failed to parse channels response by ID', { level: 'error', error: parsedIdResponse.error.message });
                throw new Error('Failed to parse channels response');
            }

            const idChannels = parsedIdResponse.data.items.map(mapChannelItem);
            allChannels.push(...idChannels);
        }

        // Fetch channels by handle
        if (handles && handles.length > 0) {
            // YouTube handles are used with the forHandle parameter
            for (const handle of handles) {
                // https://developers.google.com/youtube/v3/docs/channels/list
                const handleResponse = await nango.get({
                    endpoint: '/youtube/v3/channels',
                    params: {
                        part: 'contentDetails,snippet,statistics,brandingSettings',
                        forHandle: handle.startsWith('@') ? handle : `@${handle}`,
                        maxResults: '5'
                    },
                    retries: 3
                });

                const parsedHandleResponse = ChannelsListResponseSchema.safeParse(handleResponse.data);

                if (!parsedHandleResponse.success) {
                    await nango.log('Failed to parse channels response by handle', { level: 'error', error: parsedHandleResponse.error.message });
                    throw new Error('Failed to parse channels response');
                }

                const handleChannels = parsedHandleResponse.data.items.map(mapChannelItem);
                allChannels.push(...handleChannels);
            }
        }

        // Fetch the authenticated user's channel(s)
        if (mine) {
            // https://developers.google.com/youtube/v3/docs/channels/list
            const mineResponse = await nango.get({
                endpoint: '/youtube/v3/channels',
                params: {
                    part: 'contentDetails,snippet,statistics,brandingSettings',
                    mine: 'true',
                    maxResults: '5'
                },
                retries: 3
            });

            const parsedMineResponse = ChannelsListResponseSchema.safeParse(mineResponse.data);

            if (!parsedMineResponse.success) {
                await nango.log('Failed to parse channels response for mine=true', { level: 'error', error: parsedMineResponse.error.message });
                throw new Error('Failed to parse channels response');
            }

            const mineChannels = parsedMineResponse.data.items.map(mapChannelItem);
            allChannels.push(...mineChannels);
        }

        // Remove duplicates by ID
        const uniqueChannels = Array.from(new Map(allChannels.map((c) => [c.id, c])).values());

        if (uniqueChannels.length > 0) {
            await nango.batchSave(uniqueChannels, 'Channel');
        }

        await nango.trackDeletesEnd('Channel');

        function mapChannelItem(item: ChannelItem): z.infer<typeof ChannelSchema> {
            const snippet = item.snippet;
            const statistics = item.statistics;
            const contentDetails = item.contentDetails;
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
                ...(contentDetails?.privacyStatus != null && { privacyStatus: contentDetails.privacyStatus }),
                ...(contentDetails?.isLinked != null && { isLinked: contentDetails.isLinked }),
                ...(status?.madeForKids != null && { madeForKids: status.madeForKids }),
                ...(status?.selfDeclaredMadeForKids != null && { selfDeclaredMadeForKids: status.selfDeclaredMadeForKids })
            };
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
