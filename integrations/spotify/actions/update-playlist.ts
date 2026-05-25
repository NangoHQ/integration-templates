import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    playlistId: z.string().describe('The Spotify ID of the playlist. Example: "0PUR2D6eCDOIjLIeu9kIcq"'),
    name: z.string().optional().describe('The new name for the playlist.'),
    description: z.string().nullable().optional().describe('The new description for the playlist. Pass null to clear the description.'),
    public: z.boolean().optional().describe('If true, the playlist will be public. If false, it will be private.'),
    collaborative: z.boolean().optional().describe('If true, the playlist will become collaborative and other users will be able to modify it.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    playlistId: z.string()
});

const action = createAction({
    description: "Update a playlist's details (name, description, public/private status).",
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-playlist',
        group: 'Playlists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['playlist-modify-public', 'playlist-modify-private'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build the request body, only including fields that are provided
        const body: Record<string, unknown> = {};

        if (input.name !== undefined) {
            body['name'] = input.name;
        }

        if (input.description !== undefined) {
            body['description'] = input.description;
        }

        if (input.public !== undefined) {
            body['public'] = input.public;
        }

        if (input.collaborative !== undefined) {
            body['collaborative'] = input.collaborative;
        }

        // https://developer.spotify.com/documentation/web-api/reference/change-playlist-details
        await nango.put({
            endpoint: `/v1/playlists/${encodeURIComponent(input.playlistId)}`,
            data: body,
            retries: 3
        });

        return {
            success: true,
            playlistId: input.playlistId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
