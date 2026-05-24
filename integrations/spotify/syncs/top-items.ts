import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks
const TIME_RANGES: Array<'short_term' | 'medium_term' | 'long_term'> = ['short_term', 'medium_term', 'long_term'];
const TYPES: Array<'artists' | 'tracks'> = ['artists', 'tracks'];
const TOP_ITEM_TARGETS = TYPES.flatMap((type) => TIME_RANGES.map((timeRange) => ({ type, timeRange })));

const TopItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['artist', 'track']),
    time_range: z.enum(['short_term', 'medium_term', 'long_term']),
    popularity: z.number().optional(),
    uri: z.string().optional(),
    external_urls: z
        .object({
            spotify: z.string().optional()
        })
        .optional(),
    // Artist-specific fields
    genres: z.array(z.string()).optional(),
    // Track-specific fields
    artists: z
        .array(
            z.object({
                id: z.string(),
                name: z.string()
            })
        )
        .optional(),
    album: z
        .object({
            id: z.string(),
            name: z.string(),
            images: z
                .array(
                    z.object({
                        url: z.string(),
                        height: z.number().optional(),
                        width: z.number().optional()
                    })
                )
                .optional()
        })
        .optional(),
    duration_ms: z.number().optional(),
    explicit: z.boolean().optional()
});

const SpotifyTopArtistSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal('artist'),
    popularity: z.number().optional(),
    uri: z.string().optional(),
    external_urls: z
        .object({
            spotify: z.string().optional()
        })
        .optional(),
    genres: z.array(z.string()).optional()
});

const SpotifyTopTrackSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal('track'),
    popularity: z.number().optional(),
    uri: z.string().optional(),
    external_urls: z
        .object({
            spotify: z.string().optional()
        })
        .optional(),
    artists: z
        .array(
            z.object({
                id: z.string(),
                name: z.string()
            })
        )
        .optional(),
    album: z
        .object({
            id: z.string(),
            name: z.string(),
            images: z
                .array(
                    z.object({
                        url: z.string(),
                        height: z.number().optional(),
                        width: z.number().optional()
                    })
                )
                .optional()
        })
        .optional(),
    duration_ms: z.number().optional(),
    explicit: z.boolean().optional()
});

const CheckpointSchema = z.object({
    target_index: z.number().int().min(0),
    offset: z.number().int().min(0)
});

type TopItem = z.infer<typeof TopItemSchema>;

const sync = createSync({
    description: "Sync the user's top artists and tracks across all time ranges.",
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/top-items' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        TopItem: TopItemSchema
    },
    scopes: ['user-top-read'],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // Full refresh: track deletes before fetching new data
        await nango.trackDeletesStart('TopItem');

        for (let targetIndex = checkpoint?.target_index ?? 0; targetIndex < TOP_ITEM_TARGETS.length; targetIndex++) {
            const target = TOP_ITEM_TARGETS[targetIndex];
            if (!target) {
                break;
            }

            const { type, timeRange } = target;
            let offset = targetIndex === checkpoint?.target_index ? checkpoint.offset : 0;

            const proxyConfig: ProxyConfiguration = {
                // https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks
                endpoint: `/v1/me/top/${type}`,
                params: {
                    time_range: timeRange,
                    limit: 50
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'offset',
                    offset_start_value: offset,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'limit',
                    limit: 50,
                    response_path: 'items'
                },
                retries: 3
            };

            for await (const batch of nango.paginate<z.infer<typeof SpotifyTopArtistSchema> | z.infer<typeof SpotifyTopTrackSchema>>(proxyConfig)) {
                const parsedBatch = (type === 'artists' ? z.array(SpotifyTopArtistSchema) : z.array(SpotifyTopTrackSchema)).safeParse(batch);

                if (!parsedBatch.success) {
                    throw new Error(`Failed to parse top ${type} response: ${parsedBatch.error.message}`);
                }

                const items: TopItem[] = parsedBatch.data.map((item) => {
                    const baseProperties = {
                        id: `${item.id}_${timeRange}`,
                        name: item.name,
                        time_range: timeRange,
                        popularity: item.popularity,
                        uri: item.uri,
                        external_urls: item.external_urls
                    };

                    if (item.type === 'artist') {
                        return {
                            ...baseProperties,
                            type: 'artist',
                            genres: item.genres
                        };
                    }

                    return {
                        ...baseProperties,
                        type: 'track',
                        artists: item.artists,
                        album: item.album,
                        duration_ms: item.duration_ms,
                        explicit: item.explicit
                    };
                });

                if (items.length > 0) {
                    await nango.batchSave(items, 'TopItem');
                }

                offset += parsedBatch.data.length;
                await nango.saveCheckpoint({
                    target_index: targetIndex,
                    offset
                });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('TopItem');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
