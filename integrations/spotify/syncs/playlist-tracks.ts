import { createSync } from 'nango';
import { z } from 'zod';

// Spotify Track object from playlist items endpoint
// https://developer.spotify.com/documentation/web-api/reference/get-playlists-tracks
const SpotifyTrackSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal('track'),
    uri: z.string(),
    duration_ms: z.number(),
    explicit: z.boolean(),
    popularity: z.number().optional(),
    preview_url: z.string().nullable().optional(),
    track_number: z.number().optional(),
    disc_number: z.number().optional(),
    artists: z
        .array(
            z.object({
                id: z.string(),
                name: z.string(),
                uri: z.string().optional()
            }),
            'Spotify artist objects'
        )
        .optional(),
    album: z
        .object({
            id: z.string(),
            name: z.string(),
            uri: z.string().optional(),
            images: z
                .array(
                    z.object({
                        url: z.string(),
                        height: z.number().nullable(),
                        width: z.number().nullable()
                    }),
                    'Image objects for the album'
                )
                .optional()
        })
        .optional(),
    external_urls: z.record(z.string(), z.string(), 'External URLs for the track').optional(),
    external_ids: z.record(z.string(), z.string(), 'External IDs for the track').optional()
});

const SpotifyEpisodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal('episode'),
    uri: z.string(),
    duration_ms: z.number(),
    explicit: z.boolean().optional(),
    description: z.string().optional(),
    html_description: z.string().optional(),
    images: z
        .array(
            z.object({
                url: z.string(),
                height: z.number().nullable(),
                width: z.number().nullable()
            }),
            'Image objects for the episode'
        )
        .optional(),
    external_urls: z.record(z.string(), z.string(), 'External URLs for the episode').optional(),
    show: z
        .object({
            id: z.string(),
            name: z.string(),
            uri: z.string().optional()
        })
        .optional()
});

const SpotifyPlaylistItemSchema = z.object({
    added_at: z.string().optional(),
    added_by: z
        .object({
            id: z.string().optional(),
            type: z.string().optional(),
            uri: z.string().optional()
        })
        .optional(),
    is_local: z.boolean().optional(),
    track: z.union([SpotifyTrackSchema, SpotifyEpisodeSchema, z.null()], 'Track or episode in playlist').optional()
});

const SpotifyPlaylistSchema = z.object({
    id: z.string(),
    snapshot_id: z.string(),
    name: z.string().optional(),
    owner: z
        .object({
            id: z.string().optional(),
            type: z.string().optional()
        })
        .optional()
});

const PlaylistTrackSchema = z.object({
    id: z.string(),
    playlist_id: z.string(),
    track_id: z.string().optional(),
    episode_id: z.string().optional(),
    name: z.string().optional(),
    type: z.enum(['track', 'episode']).optional(),
    uri: z.string().optional(),
    added_at: z.string().optional(),
    added_by_id: z.string().optional(),
    is_local: z.boolean().optional(),
    duration_ms: z.number().optional(),
    explicit: z.boolean().optional(),
    artists: z.string().optional(),
    album_id: z.string().optional(),
    album_name: z.string().optional(),
    track_number: z.number().optional(),
    disc_number: z.number().optional(),
    show_id: z.string().optional(),
    show_name: z.string().optional(),
    description: z.string().optional(),
    html_description: z.string().optional()
});

const CheckpointSchema = z.object({
    snapshot_id: z.string(),
    offset: z.number()
});

const MetadataSchema = z.object({
    playlist_id: z.string().describe('The Spotify ID of the playlist to sync tracks from'),
    market: z.string().optional().describe('Optional. An ISO 3166-1 alpha-2 country code for track relinking'),
    fields: z.string().optional().describe('Optional. Comma-separated list of fields to return (e.g., items(added_at,track(name)))')
});

const sync = createSync({
    description: 'Sync tracks for a given playlist',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        PlaylistTrack: PlaylistTrackSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/playlist-tracks'
        }
    ],
    scopes: ['playlist-read-private', 'playlist-read-collaborative'],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const metadata = await nango.getMetadata();

        if (!metadata?.playlist_id) {
            throw new Error('Metadata must include playlist_id');
        }

        const playlistId = metadata.playlist_id;
        const encodedPlaylistId = encodeURIComponent(playlistId);

        // https://developer.spotify.com/documentation/web-api/reference/get-playlist
        const playlistResponse = await nango.get({
            endpoint: `/v1/playlists/${encodedPlaylistId}`,
            params: {
                fields: 'id,snapshot_id,name,owner(id,type)'
            },
            retries: 3
        });

        const parsedPlaylist = SpotifyPlaylistSchema.safeParse(playlistResponse.data);
        if (!parsedPlaylist.success) {
            throw new Error(`Failed to parse playlist: ${parsedPlaylist.error.message}`);
        }

        const playlist = parsedPlaylist.data;
        const currentSnapshotId = playlist.snapshot_id;
        const isResumingCurrentSnapshot = checkpoint?.['snapshot_id'] === currentSnapshotId && (checkpoint?.['offset'] ?? 0) > 0;

        // A matching snapshot with offset 0 means the last successful run already synced this version.
        if (checkpoint?.['snapshot_id'] === currentSnapshotId && (checkpoint?.['offset'] ?? 0) === 0) {
            await nango.log('Playlist snapshot unchanged, skipping sync', {
                playlist_id: playlistId,
                snapshot_id: currentSnapshotId
            });
            return;
        }

        await nango.log('Syncing playlist tracks', {
            playlist_id: playlistId,
            previous_snapshot: checkpoint?.['snapshot_id'] ?? 'none',
            current_snapshot: currentSnapshotId
        });

        const startOffset = isResumingCurrentSnapshot ? (checkpoint?.['offset'] ?? 0) : 0;

        // Only track deletes on a full run starting from the beginning.
        // A resumed run (startOffset > 0) only sees a subset of tracks, so items
        // from earlier pages would be falsely marked as deleted.
        const trackDeletes = startOffset === 0;
        if (trackDeletes) {
            await nango.trackDeletesStart('PlaylistTrack');
        }

        // Build pagination config with offset-based pagination
        // https://developer.spotify.com/documentation/web-api/reference/get-playlists-tracks
        // Note: Uses /items endpoint (not /tracks) per Spotify API v1
        const offsetPaginationConfig: {
            type: 'offset';
            offset_name_in_request: string;
            offset_start_value: number;
            offset_calculation_method: 'by-response-size';
            limit_name_in_request: string;
            limit: number;
            response_path: string;
        } = {
            type: 'offset',
            offset_name_in_request: 'offset',
            offset_start_value: startOffset,
            offset_calculation_method: 'by-response-size',
            limit_name_in_request: 'limit',
            limit: 100,
            response_path: 'items'
        };

        // Do not forward metadata.fields: a partial fields selector can exclude required
        // properties (e.g. the track object itself) causing delete tracking to mark
        // existing tracks as deleted.
        const proxyConfig = {
            endpoint: `/v1/playlists/${encodedPlaylistId}/items`,
            params: {
                limit: '100',
                ...(metadata.market && { market: metadata.market })
            },
            paginate: offsetPaginationConfig,
            retries: 3
        };

        let currentOffset = startOffset;

        for await (const page of nango.paginate<z.infer<typeof SpotifyPlaylistItemSchema>>(proxyConfig)) {
            const playlistTracks: Array<z.infer<typeof PlaylistTrackSchema>> = [];

            for (const item of page) {
                const parsedItem = SpotifyPlaylistItemSchema.safeParse(item);
                if (!parsedItem.success) {
                    await nango.log('Failed to parse playlist item', {
                        error: parsedItem.error.message,
                        item
                    });
                    throw new Error(`Failed to parse playlist item: ${parsedItem.error.message}`);
                }

                const validItem = parsedItem.data;
                const track = validItem.track;

                // Skip null tracks (unavailable tracks)
                if (!track) {
                    continue;
                }

                // Build a unique ID that includes position for stable ordering
                const baseId = `${playlistId}_${track.id}`;
                const uniqueId = validItem.added_at ? `${baseId}_${validItem.added_at}` : baseId;

                if (track.type === 'track') {
                    playlistTracks.push({
                        id: uniqueId,
                        playlist_id: playlistId,
                        track_id: track.id,
                        name: track.name,
                        type: 'track',
                        uri: track.uri,
                        added_at: validItem.added_at,
                        added_by_id: validItem.added_by?.id,
                        is_local: validItem.is_local,
                        duration_ms: track.duration_ms,
                        explicit: track.explicit,
                        artists: track.artists ? JSON.stringify(track.artists) : undefined,
                        album_id: track.album?.id,
                        album_name: track.album?.name,
                        track_number: track.track_number,
                        disc_number: track.disc_number
                    });
                } else {
                    // Episode
                    playlistTracks.push({
                        id: uniqueId,
                        playlist_id: playlistId,
                        episode_id: track.id,
                        name: track.name,
                        type: 'episode',
                        uri: track.uri,
                        added_at: validItem.added_at,
                        added_by_id: validItem.added_by?.id,
                        is_local: validItem.is_local,
                        duration_ms: track.duration_ms,
                        explicit: track.explicit,
                        show_id: track.show?.id,
                        show_name: track.show?.name,
                        description: track.description,
                        html_description: track.html_description
                    });
                }
            }

            if (playlistTracks.length > 0) {
                await nango.batchSave(playlistTracks, 'PlaylistTrack');
            }

            // Update offset for checkpoint (each page is 100 items)
            currentOffset = currentOffset + page.length;

            // Save checkpoint with current snapshot and offset for resume
            await nango.saveCheckpoint({
                snapshot_id: currentSnapshotId,
                offset: currentOffset
            });
        }

        // Mark delete tracking complete after successful full sync
        if (trackDeletes) {
            await nango.trackDeletesEnd('PlaylistTrack');
        }

        // Reset offset to 0 for next run (snapshot_id will be used to detect changes)
        await nango.saveCheckpoint({
            snapshot_id: currentSnapshotId,
            offset: 0
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
