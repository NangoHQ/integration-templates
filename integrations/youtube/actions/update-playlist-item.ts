import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string(),
    playlistId: z.string(),
    resourceId: z.object({
        kind: z.string(),
        videoId: z.string()
    }),
    position: z.number().int().optional(),
    note: z.string().optional(),
    startAt: z.string().optional(),
    endAt: z.string().optional()
});

const ProviderPlaylistItemSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    id: z.string(),
    snippet: z
        .object({
            publishedAt: z.string().optional(),
            channelId: z.string().optional(),
            title: z.string().optional(),
            description: z.string().optional(),
            thumbnails: z.any().optional(),
            channelTitle: z.string().optional(),
            playlistId: z.string(),
            position: z.number().int().optional(),
            resourceId: z.object({
                kind: z.string(),
                videoId: z.string()
            })
        })
        .optional(),
    contentDetails: z
        .object({
            videoId: z.string().optional(),
            startAt: z.string().optional(),
            endAt: z.string().optional(),
            note: z.string().optional(),
            videoPublishedAt: z.string().optional()
        })
        .optional(),
    status: z
        .object({
            privacyStatus: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    playlistId: z.string(),
    videoId: z.string(),
    position: z.number().int().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    publishedAt: z.string().optional(),
    channelId: z.string().optional(),
    channelTitle: z.string().optional(),
    thumbnails: z.any().optional(),
    note: z.string().optional(),
    startAt: z.string().optional(),
    endAt: z.string().optional(),
    privacyStatus: z.string().optional(),
    videoPublishedAt: z.string().optional()
});

const action = createAction({
    description: "Update a playlist item's metadata or position.",
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/youtube', 'https://www.googleapis.com/auth/youtube.force-ssl'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build the parts array based on what fields are being updated
        const parts: string[] = ['snippet'];
        if (input.note !== undefined || input.startAt !== undefined || input.endAt !== undefined) {
            parts.push('contentDetails');
        }

        // https://developers.google.com/youtube/v3/docs/playlistItems/update
        const response = await nango.put({
            endpoint: '/youtube/v3/playlistItems',
            params: {
                part: parts.join(',')
            },
            data: {
                id: input.id,
                snippet: {
                    playlistId: input.playlistId,
                    resourceId: input.resourceId,
                    ...(input.position !== undefined && { position: input.position })
                },
                ...((input.note !== undefined || input.startAt !== undefined || input.endAt !== undefined) && {
                    contentDetails: {
                        ...(input.note !== undefined && { note: input.note }),
                        ...(input.startAt !== undefined && { startAt: input.startAt }),
                        ...(input.endAt !== undefined && { endAt: input.endAt })
                    }
                })
            },
            retries: 1
        });

        const providerItem = ProviderPlaylistItemSchema.parse(response.data);

        return {
            id: providerItem.id,
            playlistId: providerItem.snippet?.playlistId ?? input.playlistId,
            videoId: providerItem.snippet?.resourceId.videoId ?? input.resourceId.videoId,
            ...(providerItem.snippet?.position !== undefined && { position: providerItem.snippet.position }),
            ...(providerItem.snippet?.title !== undefined && { title: providerItem.snippet.title }),
            ...(providerItem.snippet?.description !== undefined && { description: providerItem.snippet.description }),
            ...(providerItem.snippet?.publishedAt !== undefined && { publishedAt: providerItem.snippet.publishedAt }),
            ...(providerItem.snippet?.channelId !== undefined && { channelId: providerItem.snippet.channelId }),
            ...(providerItem.snippet?.channelTitle !== undefined && { channelTitle: providerItem.snippet.channelTitle }),
            ...(providerItem.snippet?.thumbnails !== undefined && { thumbnails: providerItem.snippet.thumbnails }),
            ...(providerItem.contentDetails?.note !== undefined && { note: providerItem.contentDetails.note }),
            ...(providerItem.contentDetails?.startAt !== undefined && { startAt: providerItem.contentDetails.startAt }),
            ...(providerItem.contentDetails?.endAt !== undefined && { endAt: providerItem.contentDetails.endAt }),
            ...(providerItem.status?.privacyStatus !== undefined && { privacyStatus: providerItem.status.privacyStatus }),
            ...(providerItem.contentDetails?.videoPublishedAt !== undefined && { videoPublishedAt: providerItem.contentDetails.videoPublishedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
