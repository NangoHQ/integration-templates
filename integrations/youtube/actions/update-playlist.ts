import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the playlist to update. Example: "PLBCF2DAC6FFB6DE8"'),
    title: z.string().optional().describe('The title of the playlist.'),
    description: z.string().optional().describe('The description of the playlist.'),
    privacyStatus: z.enum(['public', 'unlisted', 'private']).optional().describe('The privacy status of the playlist.')
});

const ProviderPlaylistSchema = z.object({
    id: z.string(),
    snippet: z
        .object({
            title: z.string(),
            description: z.string().optional(),
            publishedAt: z.string().optional()
        })
        .optional(),
    status: z
        .object({
            privacyStatus: z.enum(['public', 'unlisted', 'private'])
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    privacyStatus: z.enum(['public', 'unlisted', 'private']).optional()
});

type PlaylistUpdateBody = {
    id: string;
    snippet?: { title: string; description?: string };
    status?: { privacyStatus: 'public' | 'unlisted' | 'private' };
};

const action = createAction({
    description: "Update a YouTube playlist's metadata or privacy state",
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/youtube'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const parts: string[] = ['id'];
        const requestBody: PlaylistUpdateBody = { id: input.id };

        if (input.title !== undefined || input.description !== undefined) {
            parts.push('snippet');
            let snippetTitle: string;
            if (input.title !== undefined) {
                snippetTitle = input.title;
            } else {
                // Fetch current title to avoid clearing it when only description is updated.
                // YouTube requires snippet.title when snippet is included in the part.
                const currentResponse = await nango.get({
                    endpoint: '/youtube/v3/playlists',
                    params: { part: 'snippet', id: input.id },
                    retries: 3
                });
                snippetTitle = currentResponse.data?.items?.[0]?.snippet?.title ?? '';
            }
            requestBody.snippet = {
                title: snippetTitle,
                ...(input.description !== undefined && { description: input.description })
            };
        }

        if (input.privacyStatus !== undefined) {
            parts.push('status');
            requestBody.status = { privacyStatus: input.privacyStatus };
        }

        // https://developers.google.com/youtube/v3/docs/playlists/update
        const response = await nango.put({
            endpoint: '/youtube/v3/playlists',
            params: { part: parts.join(',') },
            data: requestBody,
            retries: 3
        });

        const providerPlaylist = ProviderPlaylistSchema.parse(response.data);

        return {
            id: providerPlaylist.id,
            ...(providerPlaylist.snippet?.title !== undefined && { title: providerPlaylist.snippet.title }),
            ...(providerPlaylist.snippet?.description !== undefined && { description: providerPlaylist.snippet.description }),
            ...(providerPlaylist.status?.privacyStatus !== undefined && { privacyStatus: providerPlaylist.status.privacyStatus })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
