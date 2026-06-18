import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    playlistId: z.string().describe('The ID of the playlist to add the video to. Example: "PLxxxxxxxxxxxxxxxxxxx"'),
    videoId: z.string().describe('The YouTube video ID to add to the playlist. Example: "dQw4w9WgXcQ"'),
    position: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('The position to insert the video into the playlist (0-based). If not specified, the video is added to the end.')
});

const ProviderSnippetSchema = z.object({
    playlistId: z.string(),
    resourceId: z.object({
        kind: z.string(),
        videoId: z.string()
    }),
    position: z.number().optional(),
    title: z.string().optional()
});

const ProviderPlaylistItemSchema = z.object({
    id: z.string(),
    snippet: ProviderSnippetSchema
});

const OutputSchema = z.object({
    id: z.string(),
    playlistId: z.string(),
    videoId: z.string(),
    position: z.number().optional(),
    title: z.string().optional()
});

const action = createAction({
    description: 'Add a video to a YouTube playlist',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/youtube.force-ssl'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/youtube/v3/docs/playlistItems/insert
        const response = await nango.post({
            endpoint: '/youtube/v3/playlistItems',
            params: {
                part: 'snippet'
            },
            data: {
                snippet: {
                    playlistId: input.playlistId,
                    resourceId: {
                        kind: 'youtube#video',
                        videoId: input.videoId
                    },
                    ...(input.position !== undefined && { position: input.position })
                }
            },
            retries: 10
        });

        const item = ProviderPlaylistItemSchema.parse(response.data);

        return {
            id: item.id,
            playlistId: item.snippet.playlistId,
            videoId: item.snippet.resourceId.videoId,
            ...(item.snippet.position !== undefined && { position: item.snippet.position }),
            ...(item.snippet.title !== undefined && { title: item.snippet.title })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
