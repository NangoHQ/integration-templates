import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Provider response schema for saved shows
// https://developer.spotify.com/documentation/web-api/reference/get-users-saved-shows
const ProviderSavedShowSchema = z.object({
    added_at: z.string(),
    show: z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        html_description: z.string().optional(),
        publisher: z.string().optional(),
        type: z.string(),
        uri: z.string(),
        external_urls: z
            .object({
                spotify: z.string().optional()
            })
            .optional(),
        images: z
            .array(
                z.object({
                    url: z.string(),
                    height: z.number().optional().nullable(),
                    width: z.number().optional().nullable()
                })
            )
            .optional(),
        languages: z.array(z.string()).optional(),
        explicit: z.boolean().optional(),
        available_markets: z.array(z.string()).optional()
    })
});

// Normalized model for saved shows
const SavedShowSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    publisher: z.string().optional(),
    added_at: z.string(),
    type: z.string(),
    uri: z.string(),
    spotify_url: z.string().optional(),
    images: z
        .array(
            z.object({
                url: z.string(),
                height: z.number().optional(),
                width: z.number().optional()
            })
        )
        .optional(),
    languages: z.array(z.string()).optional(),
    explicit: z.boolean().optional(),
    available_markets: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const sync = createSync({
    description: "Sync shows (podcasts) saved in the current user's library",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    scopes: ['user-library-read'],
    // https://developer.spotify.com/documentation/web-api/reference/get-users-saved-shows
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/saved-shows'
        }
    ],
    models: {
        SavedShow: SavedShowSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let offset = checkpoint?.offset ?? 0;

        // Spotify's /v1/me/shows endpoint has no incremental filter, so this remains
        // a full refresh and the checkpoint only resumes interrupted pagination.
        await nango.trackDeletesStart('SavedShow');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.spotify.com/documentation/web-api/reference/get-users-saved-shows
            endpoint: '/v1/me/shows',
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

        for await (const page of nango.paginate(proxyConfig)) {
            const validatedItems = page.map((item) => {
                const parsed = ProviderSavedShowSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse saved show: ${parsed.error.message}`);
                }
                return parsed.data;
            });

            const savedShows = validatedItems.map((item) => ({
                id: item.show.id,
                name: item.show.name,
                ...(item.show.description !== undefined && { description: item.show.description }),
                ...(item.show.publisher !== undefined && { publisher: item.show.publisher }),
                added_at: item.added_at,
                type: item.show.type,
                uri: item.show.uri,
                ...(item.show.external_urls?.spotify !== undefined && { spotify_url: item.show.external_urls.spotify }),
                ...(item.show.images !== undefined && {
                    images: item.show.images.map((img) => ({
                        url: img.url,
                        ...(img.height !== undefined && img.height !== null && { height: img.height }),
                        ...(img.width !== undefined && img.width !== null && { width: img.width })
                    }))
                }),
                ...(item.show.languages !== undefined && { languages: item.show.languages }),
                ...(item.show.explicit !== undefined && { explicit: item.show.explicit }),
                ...(item.show.available_markets !== undefined && { available_markets: item.show.available_markets })
            }));

            if (savedShows.length > 0) {
                await nango.batchSave(savedShows, 'SavedShow');
            }

            offset += page.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('SavedShow');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
