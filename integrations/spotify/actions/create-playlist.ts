import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name for the new playlist. Example: "My Cool Playlist"'),
    description: z.string().optional().describe('Description for the playlist.'),
    public: z.boolean().optional().describe('Whether the playlist should be public. Default: true'),
    collaborative: z.boolean().optional().describe('Whether the playlist should be collaborative.'),
    user_id: z.string().optional().describe('Optional user ID to create playlist for. If omitted, uses the current user.')
});

const ProviderPlaylistSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    public: z.boolean().nullable().optional(),
    collaborative: z.boolean().optional(),
    href: z.string().optional(),
    uri: z.string().optional(),
    owner: z
        .object({
            id: z.string().optional(),
            display_name: z.string().nullable().optional(),
            href: z.string().optional(),
            uri: z.string().optional()
        })
        .optional(),
    external_urls: z.record(z.string(), z.string()).optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The Spotify ID of the created playlist'),
    name: z.string().describe('The name of the playlist'),
    description: z.string().optional().describe('The description of the playlist'),
    isPublic: z.boolean().optional().describe('Whether the playlist is public'),
    isCollaborative: z.boolean().optional().describe('Whether the playlist is collaborative'),
    ownerId: z.string().optional().describe('The ID of the playlist owner'),
    ownerName: z.string().optional().describe('The display name of the playlist owner'),
    href: z.string().optional().describe('A link to the Web API endpoint for full details of the playlist'),
    uri: z.string().optional().describe('The Spotify URI for the playlist')
});

const action = createAction({
    description: 'Create a playlist in Spotify',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-playlist',
        group: 'Playlists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['playlist-modify-public', 'playlist-modify-private'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: {
            name: string;
            description?: string;
            public?: boolean;
            collaborative?: boolean;
        } = {
            name: input.name
        };

        if (input.description !== undefined) {
            requestBody.description = input.description;
        }

        if (input.public !== undefined) {
            requestBody.public = input.public;
        }

        if (input.collaborative !== undefined) {
            requestBody.collaborative = input.collaborative;
        }

        // https://developer.spotify.com/documentation/web-api/reference/create-playlist
        const endpoint = input.user_id ? `/v1/users/${encodeURIComponent(input.user_id)}/playlists` : '/v1/me/playlists';

        const response = await nango.post({
            endpoint: endpoint,
            data: requestBody,
            retries: 3
        });

        const providerPlaylist = ProviderPlaylistSchema.parse(response.data);

        const result: z.infer<typeof OutputSchema> = {
            id: providerPlaylist.id,
            name: providerPlaylist.name
        };

        if (providerPlaylist.description != null) {
            result.description = providerPlaylist.description;
        }

        if (providerPlaylist.public != null) {
            result.isPublic = providerPlaylist.public;
        }

        if (providerPlaylist.collaborative != null) {
            result.isCollaborative = providerPlaylist.collaborative;
        }

        if (providerPlaylist.owner != null && providerPlaylist.owner.id != null) {
            result.ownerId = providerPlaylist.owner.id;
        }

        if (providerPlaylist.owner != null && providerPlaylist.owner.display_name != null) {
            result.ownerName = providerPlaylist.owner.display_name;
        }

        if (providerPlaylist.href != null) {
            result.href = providerPlaylist.href;
        }

        if (providerPlaylist.uri != null) {
            result.uri = providerPlaylist.uri;
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
