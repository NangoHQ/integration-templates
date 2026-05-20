import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ArtistSchema = z.object({
    id: z.string(),
    name: z.string(),
    genres: z.array(z.string()).optional(),
    followers: z.number().optional(),
    popularity: z.number().optional(),
    external_urls: z.record(z.string(), z.string()).optional(),
    images: z
        .array(
            z.object({
                url: z.string(),
                height: z.number().optional(),
                width: z.number().optional()
            })
        )
        .optional(),
    uri: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync artists followed by the current user.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/artists' }],
    scopes: ['user-follow-read'],
    checkpoint: CheckpointSchema,
    models: {
        Artist: ArtistSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        await nango.trackDeletesStart('Artist');

        const params: Record<string, string | number> = {
            type: 'artist',
            limit: 50
        };
        if (checkpoint?.cursor) {
            params['after'] = checkpoint.cursor;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.spotify.com/documentation/web-api/reference/get-followed
            endpoint: '/v1/me/following',
            params,
            paginate: {
                limit: 50,
                limit_name_in_request: 'limit',
                response_path: 'artists.items',
                type: 'cursor',
                cursor_path_in_response: 'artists.cursors.after',
                cursor_name_in_request: 'after'
            },
            retries: 3
        };

        for await (const artistBatch of nango.paginate<{
            id: string;
            name: string;
            genres?: string[];
            followers?: { total?: number };
            popularity?: number;
            external_urls?: Record<string, string>;
            images?: Array<{ url: string; height?: number; width?: number }>;
            uri?: string;
        }>(proxyConfig)) {
            const artists = artistBatch.map((artist) => ({
                id: artist.id,
                name: artist.name,
                ...(artist.genres !== undefined && { genres: artist.genres }),
                ...(artist.followers?.total !== undefined && { followers: artist.followers.total }),
                ...(artist.popularity !== undefined && { popularity: artist.popularity }),
                ...(artist.external_urls !== undefined && { external_urls: artist.external_urls }),
                ...(artist.images !== undefined && { images: artist.images }),
                ...(artist.uri !== undefined && { uri: artist.uri })
            }));

            if (artists.length > 0) {
                await nango.batchSave(artists, 'Artist');
                const lastArtist = artists[artists.length - 1];
                if (lastArtist) {
                    await nango.saveCheckpoint({ cursor: lastArtist.id });
                }
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Artist');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
