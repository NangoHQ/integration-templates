import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().optional(),
    forHandle: z.string().optional(),
    forUsername: z.string().optional(),
    mine: z.boolean().optional()
});

const ChannelSnippetSchema = z
    .object({
        title: z.string().optional(),
        description: z.string().optional(),
        customUrl: z.string().optional(),
        publishedAt: z.string().optional(),
        thumbnails: z
            .record(
                z.string(),
                z.object({
                    url: z.string().optional(),
                    width: z.number().optional(),
                    height: z.number().optional()
                })
            )
            .optional(),
        defaultLanguage: z.string().optional(),
        localized: z
            .object({
                title: z.string().optional(),
                description: z.string().optional()
            })
            .optional(),
        country: z.string().optional()
    })
    .passthrough();

const ChannelContentDetailsSchema = z
    .object({
        relatedPlaylists: z
            .object({
                likes: z.string().optional(),
                favorites: z.string().optional(),
                uploads: z.string().optional()
            })
            .optional()
    })
    .passthrough();

const ChannelStatisticsSchema = z
    .object({
        viewCount: z.string().optional(),
        subscriberCount: z.string().optional(),
        hiddenSubscriberCount: z.boolean().optional(),
        videoCount: z.string().optional()
    })
    .passthrough();

const ChannelBrandingSettingsSchema = z
    .object({
        channel: z
            .object({
                title: z.string().optional(),
                description: z.string().optional(),
                keywords: z.string().optional(),
                defaultTab: z.string().optional(),
                trackingAnalyticsAccountId: z.string().optional(),
                moderateComments: z.boolean().optional(),
                showRelatedChannels: z.boolean().optional(),
                showBrowseView: z.boolean().optional(),
                featuredChannelsTitle: z.string().optional(),
                featuredChannelsUrls: z.array(z.string()).optional(),
                unsubscribedTrailer: z.string().optional(),
                profileColor: z.string().optional(),
                defaultLanguage: z.string().optional(),
                country: z.string().optional()
            })
            .optional(),
        image: z
            .object({
                bannerImageUrl: z.string().optional(),
                bannerMobileImageUrl: z.string().optional(),
                bannerTabletLowImageUrl: z.string().optional(),
                bannerTabletImageUrl: z.string().optional(),
                bannerTabletHdImageUrl: z.string().optional(),
                bannerTabletExtraHdImageUrl: z.string().optional(),
                bannerMobileLowImageUrl: z.string().optional(),
                bannerMobileMediumHdImageUrl: z.string().optional(),
                bannerMobileHdImageUrl: z.string().optional(),
                bannerMobileExtraHdImageUrl: z.string().optional(),
                bannerTvImageUrl: z.string().optional(),
                bannerTvLowImageUrl: z.string().optional(),
                bannerTvMediumImageUrl: z.string().optional(),
                bannerTvHighImageUrl: z.string().optional(),
                bannerExternalUrl: z.string().optional()
            })
            .optional(),
        watch: z
            .object({
                textColor: z.string().optional(),
                backgroundColor: z.string().optional(),
                featuredPlaylistId: z.string().optional()
            })
            .optional()
    })
    .passthrough();

const ProviderChannelSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    id: z.string(),
    snippet: ChannelSnippetSchema.optional(),
    contentDetails: ChannelContentDetailsSchema.optional(),
    statistics: ChannelStatisticsSchema.optional(),
    brandingSettings: ChannelBrandingSettingsSchema.optional()
});

const ProviderChannelsResponseSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    pageInfo: z
        .object({
            totalResults: z.number().optional(),
            resultsPerPage: z.number().optional()
        })
        .optional(),
    items: z.array(ProviderChannelSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    customUrl: z.string().optional(),
    publishedAt: z.string().optional(),
    thumbnails: z
        .record(
            z.string(),
            z.object({
                url: z.string().optional(),
                width: z.number().optional(),
                height: z.number().optional()
            })
        )
        .optional(),
    country: z.string().optional(),
    viewCount: z.string().optional(),
    subscriberCount: z.string().optional(),
    hiddenSubscriberCount: z.boolean().optional(),
    videoCount: z.string().optional(),
    relatedPlaylists: z
        .object({
            likes: z.string().optional(),
            favorites: z.string().optional(),
            uploads: z.string().optional()
        })
        .optional(),
    brandingSettings: ChannelBrandingSettingsSchema.optional()
});

const action = createAction({
    description: 'Retrieve YouTube channel details by ID, handle, username, or mine',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/youtube.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const filters = [input['id'], input['forHandle'], input['forUsername'], input['mine']].filter(Boolean);
        if (filters.length !== 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Exactly one filter must be provided: id, forHandle, forUsername, or mine'
            });
        }

        const params: Record<string, string> = {
            part: 'snippet,contentDetails,statistics,brandingSettings'
        };

        if (input['id']) {
            params['id'] = input['id'];
        } else if (input['forHandle']) {
            params['forHandle'] = input['forHandle'];
        } else if (input['forUsername']) {
            params['forUsername'] = input['forUsername'];
        } else if (input['mine']) {
            params['mine'] = 'true';
        }

        // https://developers.google.com/youtube/v3/docs/channels/list
        const response = await nango.get({
            endpoint: '/youtube/v3/channels',
            params: params,
            retries: 3
        });

        const parsed = ProviderChannelsResponseSchema.parse(response.data);

        if (!parsed.items || parsed.items.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Channel not found'
            });
        }

        const channel = parsed.items[0];

        if (!channel) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Channel not found'
            });
        }

        return {
            id: channel.id,
            ...(channel.snippet?.title !== undefined && { title: channel.snippet.title }),
            ...(channel.snippet?.description !== undefined && { description: channel.snippet.description }),
            ...(channel.snippet?.customUrl !== undefined && { customUrl: channel.snippet.customUrl }),
            ...(channel.snippet?.publishedAt !== undefined && { publishedAt: channel.snippet.publishedAt }),
            ...(channel.snippet?.thumbnails !== undefined && { thumbnails: channel.snippet.thumbnails }),
            ...(channel.snippet?.country !== undefined && { country: channel.snippet.country }),
            ...(channel.statistics?.viewCount !== undefined && { viewCount: channel.statistics.viewCount }),
            ...(channel.statistics?.subscriberCount !== undefined && { subscriberCount: channel.statistics.subscriberCount }),
            ...(channel.statistics?.hiddenSubscriberCount !== undefined && { hiddenSubscriberCount: channel.statistics.hiddenSubscriberCount }),
            ...(channel.statistics?.videoCount !== undefined && { videoCount: channel.statistics.videoCount }),
            ...(channel.contentDetails?.relatedPlaylists !== undefined && { relatedPlaylists: channel.contentDetails.relatedPlaylists }),
            ...(channel.brandingSettings !== undefined && { brandingSettings: channel.brandingSettings })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
