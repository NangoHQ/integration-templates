import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    playlist_id: z.string().describe('The Spotify ID of the playlist. Example: "0PUR2D6eCDOIjLIeu9kIcq"'),
    range_start: z.number().int().describe('The position of the first track to be reordered.'),
    insert_before: z.number().int().describe('The position where the tracks should be inserted.'),
    range_length: z.number().int().optional().describe('The amount of tracks to be reordered. Defaults to 1 if not supplied.'),
    snapshot_id: z.string().optional().describe("The playlist's snapshot ID against which you want to make the changes.")
});

const ProviderResponseSchema = z.object({
    snapshot_id: z.string().optional()
});

const OutputSchema = z.object({
    snapshot_id: z.string().optional()
});

const SpotifyErrorSchema = z.object({
    error: z
        .object({
            message: z.string().optional(),
            status: z.number().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Reorder tracks within a Spotify playlist.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['playlist-modify-public', 'playlist-modify-private'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            range_start: input.range_start,
            insert_before: input.insert_before
        };

        if (input.range_length !== undefined) {
            data['range_length'] = input.range_length;
        }

        if (input.snapshot_id !== undefined) {
            data['snapshot_id'] = input.snapshot_id;
        }

        const config: ProxyConfiguration = {
            // https://developer.spotify.com/documentation/web-api/reference/reorder-or-replace-playlists-items
            endpoint: `/v1/playlists/${encodeURIComponent(input.playlist_id)}/items`,
            data,
            retries: 3
        };

        const response = await nango.put(config);

        if (response.status !== 200) {
            const parsed = SpotifyErrorSchema.safeParse(response.data);
            const message = parsed.success && parsed.data.error?.message ? parsed.data.error.message : `Unexpected status ${response.status}`;
            throw new nango.ActionError({
                type: 'spotify_api_error',
                message,
                status: response.status
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerResponse.snapshot_id !== undefined && { snapshot_id: providerResponse.snapshot_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
