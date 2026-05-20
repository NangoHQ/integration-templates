import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PlaylistSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    collaborative: z.boolean(),
    public: z.boolean().nullable().optional(),
    snapshot_id: z.string(),
    href: z.string(),
    uri: z.string(),
    owner_id: z.string(),
    owner_display_name: z.string().nullable().optional(),
    tracks_total: z.number(),
    images: z
        .array(
            z.object({
                url: z.string(),
                height: z.number().nullable().optional(),
                width: z.number().nullable().optional()
            })
        )
        .optional()
});

const CheckpointSchema = z.object({
    offset: z.number()
});

const sync = createSync({
    description: 'Sync playlists owned or followed by the current user',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/playlists' }],
    scopes: ['playlist-read-private', 'playlist-read-collaborative'],
    checkpoint: CheckpointSchema,
    models: {
        Playlist: PlaylistSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let offset: number = checkpoint?.['offset'] ?? 0;

        await nango.trackDeletesStart('Playlist');

        // https://developer.spotify.com/documentation/web-api/reference/get-a-list-of-current-users-playlists
        const proxyConfig: ProxyConfiguration = {
            // https://developer.spotify.com/documentation/web-api/reference/get-a-list-of-current-users-playlists
            endpoint: '/v1/me/playlists',
            params: {
                limit: 50
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: offset,
                limit_name_in_request: 'limit',
                limit: 50,
                response_path: 'items'
            },
            retries: 3
        };

        for await (const items of nango.paginate<{
            id: string;
            name: string;
            description?: string | null;
            collaborative: boolean;
            public?: boolean | null;
            snapshot_id: string;
            href: string;
            uri: string;
            owner: {
                id: string;
                display_name?: string | null;
            };
            tracks: {
                total: number;
            };
            images?: Array<{
                url: string;
                height?: number | null;
                width?: number | null;
            }>;
        }>(proxyConfig)) {
            const playlists = items.map((item) => ({
                id: item.id,
                name: item.name,
                ...(item.description != null && { description: item.description }),
                collaborative: item.collaborative,
                ...(item.public != null && { public: item.public }),
                snapshot_id: item.snapshot_id,
                href: item.href,
                uri: item.uri,
                owner_id: item.owner.id,
                ...(item.owner.display_name != null && { owner_display_name: item.owner.display_name }),
                tracks_total: item.tracks?.total ?? 0,
                ...(item.images != null && {
                    images: item.images.map((img) => ({
                        url: img.url,
                        ...(img.height != null && { height: img.height }),
                        ...(img.width != null && { width: img.width })
                    }))
                })
            }));

            if (playlists.length > 0) {
                await nango.batchSave(playlists, 'Playlist');
            }

            offset += items.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Playlist');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
