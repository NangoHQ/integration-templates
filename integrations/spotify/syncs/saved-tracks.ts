import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SpotifyTrackSchema = z.object({
    id: z.string(),
    name: z.string(),
    uri: z.string(),
    type: z.string(),
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
            name: z.string()
        })
        .optional(),
    duration_ms: z.number().optional(),
    explicit: z.boolean().optional(),
    popularity: z.number().optional(),
    preview_url: z.string().nullable().optional(),
    track_number: z.number().optional(),
    disc_number: z.number().optional(),
    external_urls: z.record(z.string(), z.string()).optional(),
    href: z.string().optional()
});

const SavedTrackItemSchema = z.object({
    added_at: z.string(),
    track: SpotifyTrackSchema
});

const SavedTrackSchema = z.object({
    id: z.string(),
    name: z.string(),
    uri: z.string(),
    artistName: z.string().optional(),
    albumName: z.string().optional(),
    durationMs: z.number().optional(),
    explicit: z.boolean().optional(),
    popularity: z.number().optional(),
    previewUrl: z.string().optional(),
    addedAt: z.string(),
    trackNumber: z.number().optional(),
    discNumber: z.number().optional()
});

const CheckpointSchema = z.object({
    added_after: z.string(),
    offset: z.number().int().min(0),
    pending_added_after: z.string()
});

const LegacyCheckpointSchema = z.object({
    added_after: z.string(),
    offset: z.number().int().min(0)
});

type Models = { SavedTrack: typeof SavedTrackSchema };
type Checkpoint = typeof CheckpointSchema;

const sync = createSync<Models, undefined, Checkpoint>({
    description: "Sync tracks saved in the current user's library",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/saved-tracks',
            method: 'GET'
        }
    ],
    scopes: ['user-library-read'],
    checkpoint: CheckpointSchema,
    models: {
        SavedTrack: SavedTrackSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const checkpointParse = CheckpointSchema.safeParse(checkpoint);
        const legacyCheckpointParse = LegacyCheckpointSchema.safeParse(checkpoint);
        const addedAfter = checkpointParse.success
            ? checkpointParse.data.added_after
            : legacyCheckpointParse.success
              ? legacyCheckpointParse.data.added_after
              : '';
        const startOffset = checkpointParse.success ? checkpointParse.data.offset : legacyCheckpointParse.success ? legacyCheckpointParse.data.offset : 0;
        let pendingAddedAfter = checkpointParse.success ? checkpointParse.data.pending_added_after || undefined : undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.spotify.com/documentation/web-api/reference/get-users-saved-tracks
            endpoint: '/v1/me/tracks',
            params: {
                limit: 50
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: startOffset,
                limit_name_in_request: 'limit',
                limit: 50,
                response_path: 'items'
            },
            retries: 3
        };

        let offset = startOffset;

        for await (const page of nango.paginate(proxyConfig)) {
            const pageParse = z.array(SavedTrackItemSchema).safeParse(page);
            if (!pageParse.success) {
                throw new Error(`Failed to parse page: ${pageParse.error.message}`);
            }
            const items = pageParse.data;

            if (pendingAddedAfter === undefined && offset === 0 && items[0] !== undefined) {
                pendingAddedAfter = items[0].added_at;
            }

            const tracks = items
                .filter((item) => {
                    if (!addedAfter) {
                        return true;
                    }

                    return item.added_at > addedAfter;
                })
                .map((parsed) => {
                    const track = parsed.track;

                    const artistName = track.artists?.map((a) => a.name).join(', ');

                    return {
                        id: track.id,
                        name: track.name,
                        uri: track.uri,
                        ...(artistName && { artistName }),
                        ...(track.album && { albumName: track.album.name }),
                        ...(track.duration_ms !== undefined && { durationMs: track.duration_ms }),
                        ...(track.explicit !== undefined && { explicit: track.explicit }),
                        ...(track.popularity !== undefined && { popularity: track.popularity }),
                        ...(track.preview_url && { previewUrl: track.preview_url }),
                        addedAt: parsed.added_at,
                        ...(track.track_number !== undefined && { trackNumber: track.track_number }),
                        ...(track.disc_number !== undefined && { discNumber: track.disc_number })
                    };
                });

            const reachedCheckpointBoundary = addedAfter !== '' && tracks.length < items.length;

            if (tracks.length > 0) {
                await nango.batchSave(tracks, 'SavedTrack');
            }

            if (reachedCheckpointBoundary) {
                await nango.saveCheckpoint({
                    added_after: pendingAddedAfter ?? addedAfter,
                    offset: 0,
                    pending_added_after: ''
                });
                return;
            }

            offset += items.length;

            await nango.saveCheckpoint({
                added_after: addedAfter,
                offset,
                pending_added_after: pendingAddedAfter ?? ''
            });
        }

        await nango.saveCheckpoint({
            added_after: pendingAddedAfter ?? addedAfter,
            offset: 0,
            pending_added_after: ''
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
