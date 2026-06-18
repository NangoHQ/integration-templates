import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ids: z.array(z.string()).min(1).max(40).describe('An array of Spotify track IDs to save. Between 1 and 40 IDs. Example: ["70LcF31zb1H0PyJoS1Sx1r"]')
});

// Spotify uses spotify:track:{id} format for URIs
function buildTrackUri(trackId: string): string {
    return `spotify:track:${trackId}`;
}

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the tracks were successfully saved to the library')
});

const action = createAction({
    description: "Save one or more tracks to the current user's library.",
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-library-modify'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/save-tracks-user
        // Spotify library endpoint uses URIs as query params, not request body
        const uris = input.ids.map(buildTrackUri);
        await nango.put({
            endpoint: '/v1/me/library',
            params: {
                uris: uris
            },
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
