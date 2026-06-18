import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ids: z.array(z.string()).min(1).max(40).describe('Array of Spotify show IDs to remove from the library. Between 1 and 40 IDs.')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the shows were successfully removed from the library.')
});

const action = createAction({
    description: "Remove one or more shows (podcasts) from the current user's library.",
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-library-modify'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Convert show IDs to Spotify URIs (spotify:show:{id})
        const uris = input.ids.map((id) => `spotify:show:${id}`).join(',');

        // https://developer.spotify.com/documentation/web-api/reference/remove-from-library
        await nango.delete({
            endpoint: '/v1/me/library',
            params: {
                uris
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
