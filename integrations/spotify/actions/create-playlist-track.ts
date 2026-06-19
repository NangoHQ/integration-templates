import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    playlistId: z.string().describe('The Spotify ID of the playlist. Example: "3cEYpjA9oz9GiPac4AsH4n"'),
    uris: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe(
            'An array of Spotify URIs to add. Can be track or episode URIs. Between 1 and 100 items. Example: ["spotify:track:4iV5W9uYEdYUVa79Axb7Rh", "spotify:track:1301WleyT98MSxVHPZCA6M"]'
        ),
    position: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('The position to insert the items, a zero-based index. If omitted, items are appended to the end. Example: 0')
});

const ProviderOutputSchema = z.object({
    snapshot_id: z.string()
});

const OutputSchema = z.object({
    snapshotId: z.string().describe('A snapshot ID for the playlist after the addition')
});

const action = createAction({
    description: 'Add one or more tracks to a Spotify playlist',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['playlist-modify-public', 'playlist-modify-private'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: { uris: string[]; position?: number } = {
            uris: input.uris
        };

        if (input.position !== undefined) {
            requestBody.position = input.position;
        }

        // https://developer.spotify.com/documentation/web-api/reference/add-items-to-playlist
        const response = await nango.post({
            endpoint: `/v1/playlists/${encodeURIComponent(input.playlistId)}/items`,
            data: requestBody,
            retries: 10
        });

        const providerOutput = ProviderOutputSchema.parse(response.data);

        return {
            snapshotId: providerOutput.snapshot_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
