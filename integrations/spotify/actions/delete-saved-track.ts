import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ids: z.array(z.string()).min(1).max(50).describe('Spotify track IDs to remove from the library. Between 1 and 50 IDs. Example: ["70LcF31zb1H0PyJoS1Sx1r"]')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the tracks were successfully removed')
});

const action = createAction({
    description: "Remove one or more tracks from the current user's library.",
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-library-modify'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/remove-tracks-user
        // Note: Spotify's /v1/me/tracks DELETE endpoint uses ids in the request body,
        // but the working endpoint per validation is /v1/me/library with uris as query param
        const uris = input.ids.map((id) => `spotify:track:${encodeURIComponent(id)}`).join(',');
        await nango.delete({
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
