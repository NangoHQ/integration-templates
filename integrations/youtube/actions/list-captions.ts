import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    videoId: z.string().describe('The YouTube video ID of the video for which to return caption tracks. Example: "dQw4w9WgXcQ"')
});

const ProviderCaptionSnippetSchema = z.object({
    videoId: z.string().optional(),
    lastUpdated: z.string().optional(),
    trackKind: z.string().optional(),
    language: z.string().optional(),
    name: z.string().optional(),
    audioTrackType: z.string().optional(),
    isCC: z.boolean().optional(),
    isLarge: z.boolean().optional(),
    isEasyReader: z.boolean().optional(),
    isDraft: z.boolean().optional(),
    isAutoSynced: z.boolean().optional(),
    status: z.string().optional(),
    failureReason: z.string().optional()
});

const ProviderCaptionSchema = z.object({
    id: z.string(),
    snippet: ProviderCaptionSnippetSchema.optional()
});

const CaptionSchema = z.object({
    id: z.string(),
    videoId: z.string().optional(),
    lastUpdated: z.string().optional(),
    trackKind: z.string().optional(),
    language: z.string().optional(),
    name: z.string().optional(),
    audioTrackType: z.string().optional(),
    isCC: z.boolean().optional(),
    isLarge: z.boolean().optional(),
    isEasyReader: z.boolean().optional(),
    isDraft: z.boolean().optional(),
    isAutoSynced: z.boolean().optional(),
    status: z.string().optional(),
    failureReason: z.string().optional()
});

const ListOutputSchema = z.object({
    items: z.array(CaptionSchema),
    nextPageToken: z.string().optional().describe('The token for the next page of results.')
});

const action = createAction({
    description: 'List caption tracks for a YouTube video.',
    version: '1.0.1',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['https://www.googleapis.com/auth/youtube.force-ssl'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const response = await nango.get({
            // https://developers.google.com/youtube/v3/docs/captions/list
            endpoint: '/youtube/v3/captions',
            params: {
                videoId: input.videoId,
                part: 'id,snippet'
            },
            retries: 3
        });

        if (!response.data || !response.data.items) {
            return {
                items: []
            };
        }

        const providerResponse = z
            .object({
                items: z.array(ProviderCaptionSchema).optional(),
                nextPageToken: z.string().optional()
            })
            .parse(response.data);

        const items =
            providerResponse.items?.map((item) => {
                const snippet = item.snippet;
                return {
                    id: item.id,
                    ...(snippet?.videoId !== undefined && { videoId: snippet.videoId }),
                    ...(snippet?.lastUpdated !== undefined && { lastUpdated: snippet.lastUpdated }),
                    ...(snippet?.trackKind !== undefined && { trackKind: snippet.trackKind }),
                    ...(snippet?.language !== undefined && { language: snippet.language }),
                    ...(snippet?.name !== undefined && { name: snippet.name }),
                    ...(snippet?.audioTrackType !== undefined && { audioTrackType: snippet.audioTrackType }),
                    ...(snippet?.isCC !== undefined && { isCC: snippet.isCC }),
                    ...(snippet?.isLarge !== undefined && { isLarge: snippet.isLarge }),
                    ...(snippet?.isEasyReader !== undefined && { isEasyReader: snippet.isEasyReader }),
                    ...(snippet?.isDraft !== undefined && { isDraft: snippet.isDraft }),
                    ...(snippet?.isAutoSynced !== undefined && { isAutoSynced: snippet.isAutoSynced }),
                    ...(snippet?.status !== undefined && { status: snippet.status }),
                    ...(snippet?.failureReason !== undefined && { failureReason: snippet.failureReason })
                };
            }) || [];

        return {
            items,
            ...(providerResponse.nextPageToken !== undefined && { nextPageToken: providerResponse.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
