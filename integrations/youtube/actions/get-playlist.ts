import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    playlistId: z.string().describe('The ID of the YouTube playlist to retrieve. Example: "PLxxxxxxxxxxxxxxxxxxx"')
});

// YouTube API uses camelCase for field names
// https://developers.google.com/youtube/v3/docs/playlists#resource
const ProviderSnippetSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    publishedAt: z.string().optional(),
    channelId: z.string().optional(),
    channelTitle: z.string().optional(),
    thumbnails: z
        .record(
            z.string(),
            z.object({
                url: z.string(),
                width: z.number().optional(),
                height: z.number().optional()
            })
        )
        .optional()
});

const ProviderContentDetailsSchema = z.object({
    itemCount: z.number().optional()
});

const ProviderStatusSchema = z.object({
    privacyStatus: z.enum(['public', 'unlisted', 'private']).optional(),
    publishAt: z.string().optional(),
    license: z.string().optional(),
    embeddable: z.boolean().optional(),
    publicStatsViewable: z.boolean().optional(),
    madeForKids: z.boolean().optional()
});

const ProviderPlaylistSchema = z.object({
    id: z.string(),
    snippet: ProviderSnippetSchema.optional(),
    contentDetails: ProviderContentDetailsSchema.optional(),
    status: ProviderStatusSchema.optional(),
    etag: z.string().optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderPlaylistSchema).optional()
});

// Output follows YouTube's camelCase convention
const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    publishedAt: z.string().optional(),
    channelId: z.string().optional(),
    channelTitle: z.string().optional(),
    itemCount: z.number().optional(),
    privacyStatus: z.enum(['public', 'unlisted', 'private']).optional(),
    thumbnails: z
        .record(
            z.string(),
            z.object({
                url: z.string(),
                width: z.number().optional(),
                height: z.number().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Retrieve a YouTube playlist by playlist ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-playlist',
        group: 'Playlists'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/youtube/v3/docs/playlists/list
        const response = await nango.get({
            endpoint: '/youtube/v3/playlists',
            params: {
                id: input.playlistId,
                part: 'snippet,contentDetails,status'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'Invalid response from YouTube API',
                details: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
            });
        }

        const items = parsed.data.items || [];
        if (items.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Playlist not found',
                playlistId: input.playlistId
            });
        }

        const playlist = items[0]!;
        const snippet = playlist.snippet || {};
        const contentDetails = playlist.contentDetails || {};
        const status = playlist.status || {};

        return {
            id: playlist.id,
            ...(snippet.title !== undefined && { title: snippet.title }),
            ...(snippet.description !== undefined && { description: snippet.description }),
            ...(snippet.publishedAt !== undefined && { publishedAt: snippet.publishedAt }),
            ...(snippet.channelId !== undefined && { channelId: snippet.channelId }),
            ...(snippet.channelTitle !== undefined && { channelTitle: snippet.channelTitle }),
            ...(snippet.thumbnails !== undefined && { thumbnails: snippet.thumbnails }),
            ...(contentDetails.itemCount !== undefined && { itemCount: contentDetails.itemCount }),
            ...(status.privacyStatus !== undefined && { privacyStatus: status.privacyStatus })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
