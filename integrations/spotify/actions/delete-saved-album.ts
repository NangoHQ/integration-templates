import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ids: z.array(z.string()).min(1).max(40).describe("Array of Spotify album IDs to remove from the user's library. Between 1 and 40 IDs.")
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the albums were successfully removed from the library.')
});

const action = createAction({
    description: "Remove one or more albums from the current user's library.",
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-saved-album',
        group: 'Library'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-library-modify'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/remove-from-library
        await nango.delete({
            endpoint: '/v1/me/library',
            params: {
                uris: input.ids.map((id) => `spotify:album:${id}`).join(',')
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
