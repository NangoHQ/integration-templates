import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Provider API docs: https://developer.spotify.com/documentation/web-api/reference/get-users-saved-albums
const SpotifyAlbumSchema = z.object({
    album: z.object({
        id: z.string(),
        name: z.string(),
        album_type: z.string().optional(),
        artists: z
            .array(
                z.object({
                    id: z.string(),
                    name: z.string()
                })
            )
            .optional(),
        external_urls: z
            .object({
                spotify: z.string().optional()
            })
            .optional(),
        images: z
            .array(
                z.object({
                    url: z.string(),
                    height: z.number().optional(),
                    width: z.number().optional()
                })
            )
            .optional(),
        release_date: z.string().optional(),
        total_tracks: z.number().optional()
    }),
    added_at: z.string()
});

const AlbumSchema = z.object({
    id: z.string(),
    name: z.string(),
    albumType: z.string().optional(),
    artists: z
        .array(
            z.object({
                id: z.string(),
                name: z.string()
            })
        )
        .optional(),
    spotifyUrl: z.string().optional(),
    images: z
        .array(
            z.object({
                url: z.string(),
                height: z.number().optional(),
                width: z.number().optional()
            })
        )
        .optional(),
    releaseDate: z.string().optional(),
    totalTracks: z.number().optional(),
    addedAt: z.string()
});

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const sync = createSync({
    description: "Sync albums saved in the current user's library",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Album: AlbumSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/albums'
        }
    ],
    scopes: ['user-library-read'],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let offset = checkpoint?.offset ?? 0;

        // https://developer.spotify.com/documentation/web-api/reference/get-users-saved-albums
        await nango.trackDeletesStart('Album');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.spotify.com/documentation/web-api/reference/get-users-saved-albums
            endpoint: '/v1/me/albums',
            params: {
                limit: 50
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: offset,
                offset_calculation_method: 'by-response-size',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 50
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const items = z.array(SpotifyAlbumSchema).safeParse(page);

            if (!items.success) {
                throw new Error(`Failed to parse albums: ${items.error.message}`);
            }

            const albums = items.data.map((item) => ({
                id: item.album.id,
                name: item.album.name,
                ...(item.album.album_type && { albumType: item.album.album_type }),
                ...(item.album.artists && { artists: item.album.artists }),
                ...(item.album.external_urls?.spotify && { spotifyUrl: item.album.external_urls.spotify }),
                ...(item.album.images && { images: item.album.images }),
                ...(item.album.release_date && { releaseDate: item.album.release_date }),
                ...(item.album.total_tracks && { totalTracks: item.album.total_tracks }),
                addedAt: item.added_at
            }));

            if (albums.length > 0) {
                await nango.batchSave(albums, 'Album');
            }

            offset += items.data.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Album');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
