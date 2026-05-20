import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// https://developer.spotify.com/documentation/web-api/reference/get-users-saved-episodes
const SpotifyEpisodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    duration_ms: z.number(),
    explicit: z.boolean().optional(),
    images: z
        .array(
            z.object({
                url: z.string(),
                height: z.number().nullable(),
                width: z.number().nullable()
            })
        )
        .optional(),
    release_date: z.string().optional(),
    release_date_precision: z.string().optional(),
    resume_point: z
        .object({
            fully_played: z.boolean(),
            resume_position_ms: z.number()
        })
        .optional(),
    show: z
        .object({
            id: z.string(),
            name: z.string(),
            publisher: z.string().optional()
        })
        .optional()
});

const SpotifySavedEpisodeSchema = z.object({
    added_at: z.string(),
    episode: SpotifyEpisodeSchema
});

const SavedEpisodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    duration_ms: z.number(),
    explicit: z.boolean().optional(),
    added_at: z.string(),
    release_date: z.string().optional(),
    release_date_precision: z.string().optional(),
    show_id: z.string().optional(),
    show_name: z.string().optional(),
    show_publisher: z.string().optional(),
    images: z
        .array(
            z.object({
                url: z.string(),
                height: z.number().nullable(),
                width: z.number().nullable()
            })
        )
        .optional(),
    resume_point_fully_played: z.boolean().optional(),
    resume_position_ms: z.number().optional()
});

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const sync = createSync({
    description: "Sync podcast episodes saved in the current user's library.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        SavedEpisode: SavedEpisodeSchema
    },
    scopes: ['user-library-read'],
    endpoints: [
        // https://developer.spotify.com/documentation/web-api/reference/get-users-saved-episodes
        {
            path: '/syncs/saved-episodes',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let offset = checkpoint?.offset ?? 0;

        // Spotify /v1/me/episodes has no incremental filter, so this stays a full refresh.
        // The offset checkpoint only lets interrupted runs resume mid-scan.
        await nango.trackDeletesStart('SavedEpisode');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.spotify.com/documentation/web-api/reference/get-users-saved-episodes
            endpoint: '/v1/me/episodes',
            params: {
                limit: '50'
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

        for await (const page of nango.paginate<z.infer<typeof SpotifySavedEpisodeSchema>>(proxyConfig)) {
            const episodes: z.infer<typeof SavedEpisodeSchema>[] = [];

            for (const item of page) {
                const parseResult = SpotifySavedEpisodeSchema.safeParse(item);
                if (!parseResult.success) {
                    // Fail the run rather than skip — skipping a row while delete tracking is
                    // active would make that episode appear deleted on the next trackDeletesEnd.
                    throw new Error(`Failed to parse saved episode: ${parseResult.error.message}`);
                }
                const savedEpisode = parseResult.data;
                episodes.push({
                    id: savedEpisode.episode.id,
                    name: savedEpisode.episode.name,
                    description: savedEpisode.episode.description,
                    duration_ms: savedEpisode.episode.duration_ms,
                    explicit: savedEpisode.episode.explicit,
                    added_at: savedEpisode.added_at,
                    release_date: savedEpisode.episode.release_date,
                    release_date_precision: savedEpisode.episode.release_date_precision,
                    show_id: savedEpisode.episode.show?.id,
                    show_name: savedEpisode.episode.show?.name,
                    show_publisher: savedEpisode.episode.show?.publisher,
                    images: savedEpisode.episode.images,
                    resume_point_fully_played: savedEpisode.episode.resume_point?.fully_played,
                    resume_position_ms: savedEpisode.episode.resume_point?.resume_position_ms
                });
            }

            if (episodes.length > 0) {
                await nango.batchSave(episodes, 'SavedEpisode');
            }

            offset += page.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('SavedEpisode');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
