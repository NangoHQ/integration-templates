import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const _RecentlyPlayedItemSchema = z.object({
    track: z.object({
        id: z.string(),
        name: z.string(),
        uri: z.string(),
        duration_ms: z.number(),
        explicit: z.boolean(),
        preview_url: z.string().nullable(),
        artists: z.array(
            z.object({
                id: z.string(),
                name: z.string(),
                uri: z.string()
            })
        ),
        album: z.object({
            id: z.string(),
            name: z.string(),
            uri: z.string(),
            images: z.array(
                z.object({
                    url: z.string(),
                    height: z.number().nullable(),
                    width: z.number().nullable()
                })
            )
        })
    }),
    played_at: z.string(),
    context: z
        .object({
            type: z.string(),
            href: z.string(),
            external_urls: z.object({
                spotify: z.string()
            }),
            uri: z.string()
        })
        .nullable()
});

const RecentlyPlayedSchema = z.object({
    id: z.string(),
    trackId: z.string(),
    trackName: z.string(),
    trackUri: z.string(),
    durationMs: z.number(),
    explicit: z.boolean(),
    previewUrl: z.string().optional(),
    artistIds: z.array(z.string()),
    artistNames: z.array(z.string()),
    albumId: z.string(),
    albumName: z.string(),
    playedAt: z.string(),
    contextType: z.string().optional(),
    contextUri: z.string().optional()
});

const CheckpointSchema = z.object({
    after: z.number()
});

const sync = createSync<
    {
        RecentlyPlayed: typeof RecentlyPlayedSchema;
    },
    never,
    typeof CheckpointSchema
>({
    description: 'Sync recently played Spotify tracks',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['user-read-recently-played'],
    endpoints: [
        {
            path: '/syncs/recently-played',
            method: 'GET'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        RecentlyPlayed: RecentlyPlayedSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const after = checkpoint?.after;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.spotify.com/documentation/web-api/reference/get-recently-played
            endpoint: '/v1/me/player/recently-played',
            params: {
                limit: 50,
                ...(after !== undefined && { after: String(after) })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'after',
                cursor_path_in_response: 'cursors.after',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 50
            },
            retries: 3
        };

        let maxPlayedAt: string | undefined;
        let maxPlayedAtTimestamp: number | undefined;

        for await (const items of nango.paginate<z.infer<typeof _RecentlyPlayedItemSchema>>(proxyConfig)) {
            const records = items.map((item) => {
                const track = item.track;
                return {
                    id: `${track.id}_${item.played_at}`,
                    trackId: track.id,
                    trackName: track.name,
                    trackUri: track.uri,
                    durationMs: track.duration_ms,
                    explicit: track.explicit,
                    ...(track.preview_url !== null && { previewUrl: track.preview_url }),
                    artistIds: track.artists.map((a) => a.id),
                    artistNames: track.artists.map((a) => a.name),
                    albumId: track.album.id,
                    albumName: track.album.name,
                    playedAt: item.played_at,
                    ...(item.context !== null && {
                        contextType: item.context.type,
                        contextUri: item.context.uri
                    })
                };
            });

            if (records.length === 0) {
                continue;
            }

            await nango.batchSave(records, 'RecentlyPlayed');

            // Track the most recent played_at for checkpoint
            for (const record of records) {
                if (maxPlayedAt === undefined || record.playedAt > maxPlayedAt) {
                    maxPlayedAt = record.playedAt;
                    maxPlayedAtTimestamp = Date.parse(record.playedAt);
                }
            }
        }

        // Save checkpoint with the most recent played_at timestamp for next incremental sync
        if (maxPlayedAtTimestamp !== undefined) {
            await nango.saveCheckpoint({
                after: maxPlayedAtTimestamp
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
