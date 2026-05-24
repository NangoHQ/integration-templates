import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ids: z.array(z.string()).max(20).describe("Spotify album IDs to save to the user's library. Maximum 20.")
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the albums were successfully saved.')
});

const action = createAction({
    description: "Save one or more albums to the current user's library.",
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-saved-album',
        group: 'Library'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-library-modify'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/save-albums-user
        const uris = input.ids.map((id) => `spotify:album:${id}`);
        await nango.put({
            endpoint: '/v1/me/library',
            params: {
                uris: uris.join(',')
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
