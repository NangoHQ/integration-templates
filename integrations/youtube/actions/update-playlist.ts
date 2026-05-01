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
    snippet: z.object({
        title: z.string(),
        description: z.string().optional(),
        publishedAt: z.string().optional()
    }),
    status: z.object({
        privacyStatus: z.enum(['public', 'unlisted', 'private'])
    })
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    privacyStatus: z.enum(['public', 'unlisted', 'private'])
});

type Snippet = {
    title?: string;
    description?: string;
};

type Status = {
    privacyStatus?: 'public' | 'unlisted' | 'private';
};

type PlaylistUpdateBody = {
    id: string;
    snippet: Snippet;
    status: Status;
};

const action = createAction({
    description: "Update a YouTube playlist's metadata or privacy state",
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-playlist',
        group: 'Playlists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/youtube'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: PlaylistUpdateBody = {
            id: input.id,
            snippet: {},
            status: {}
        };

        if (input.title !== undefined) {
            requestBody.snippet.title = input.title;
        }

        if (input.description !== undefined) {
            requestBody.snippet.description = input.description;
        }

        if (input.privacyStatus !== undefined) {
            requestBody.status.privacyStatus = input.privacyStatus;
        }

        // https://developers.google.com/youtube/v3/docs/playlists/update
        const response = await nango.put({
            endpoint: '/youtube/v3/playlists',
            params: {
                part: 'snippet,status'
            },
            data: requestBody,
            retries: 3
        });

        const providerPlaylist = ProviderPlaylistSchema.parse(response.data);

        return {
            id: providerPlaylist.id,
            title: providerPlaylist.snippet.title,
            ...(providerPlaylist.snippet.description !== undefined && {
                description: providerPlaylist.snippet.description
            }),
            privacyStatus: providerPlaylist.status.privacyStatus
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
