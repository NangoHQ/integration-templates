import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    market: z.string().optional().describe('An ISO 3166-1 alpha-2 country code. Example: "US"'),
    additional_types: z.string().optional().describe('A comma-separated list of item types. Valid types are: track, episode. Example: "track,episode"')
});

const DeviceSchema = z.object({
    id: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
    is_private_session: z.boolean().optional(),
    is_restricted: z.boolean().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    volume_percent: z.number().nullable().optional(),
    supports_volume: z.boolean().optional()
});

const ContextSchema = z.object({
    type: z.string().optional(),
    href: z.string().optional(),
    external_urls: z.record(z.string(), z.string()).optional(),
    uri: z.string().optional()
});

const ImageSchema = z.object({
    url: z.string().optional(),
    height: z.number().nullable().optional(),
    width: z.number().nullable().optional()
});

const SimplifiedArtistSchema = z.object({
    external_urls: z.record(z.string(), z.string()).optional(),
    href: z.string().optional(),
    id: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    uri: z.string().optional()
});

const TrackSchema = z.object({
    album: z
        .object({
            album_type: z.string().optional(),
            artists: z.array(SimplifiedArtistSchema).optional(),
            available_markets: z.array(z.string()).optional(),
            external_urls: z.record(z.string(), z.string()).optional(),
            href: z.string().optional(),
            id: z.string().optional(),
            images: z.array(ImageSchema).optional(),
            name: z.string().optional(),
            release_date: z.string().optional(),
            release_date_precision: z.string().optional(),
            total_tracks: z.number().optional(),
            type: z.string().optional(),
            uri: z.string().optional()
        })
        .optional(),
    artists: z.array(SimplifiedArtistSchema).optional(),
    available_markets: z.array(z.string()).optional(),
    disc_number: z.number().optional(),
    duration_ms: z.number().optional(),
    explicit: z.boolean().optional(),
    external_ids: z.record(z.string(), z.string()).optional(),
    external_urls: z.record(z.string(), z.string()).optional(),
    href: z.string().optional(),
    id: z.string().optional(),
    is_local: z.boolean().optional(),
    name: z.string().optional(),
    popularity: z.number().optional(),
    preview_url: z.string().nullable().optional(),
    track_number: z.number().optional(),
    type: z.string().optional(),
    uri: z.string().optional()
});

const EpisodeSchema = z.object({
    audio_preview_url: z.string().nullable().optional(),
    description: z.string().optional(),
    duration_ms: z.number().optional(),
    explicit: z.boolean().optional(),
    external_urls: z.record(z.string(), z.string()).optional(),
    href: z.string().optional(),
    html_description: z.string().optional(),
    id: z.string().optional(),
    images: z.array(ImageSchema).optional(),
    is_externally_hosted: z.boolean().optional(),
    is_playable: z.boolean().optional(),
    language: z.string().optional(),
    languages: z.array(z.string()).optional(),
    name: z.string().optional(),
    release_date: z.string().optional(),
    release_date_precision: z.string().optional(),
    resume_point: z
        .object({
            fully_played: z.boolean().optional(),
            resume_position_ms: z.number().optional()
        })
        .optional(),
    type: z.string().optional(),
    uri: z.string().optional()
});

const CurrentlyPlayingSchema = z.object({
    device: DeviceSchema.optional(),
    repeat_state: z.string().optional(),
    shuffle_state: z.boolean().optional(),
    context: ContextSchema.nullable().optional(),
    timestamp: z.number().optional(),
    progress_ms: z.number().nullable().optional(),
    is_playing: z.boolean().optional(),
    item: z.union([TrackSchema, EpisodeSchema]).nullable().optional(),
    currently_playing_type: z.string().optional(),
    actions: z
        .object({
            disallows: z.record(z.string(), z.boolean()).optional()
        })
        .optional()
});

const OutputSchema = z.object({
    device: DeviceSchema.optional(),
    repeat_state: z.string().optional(),
    shuffle_state: z.boolean().optional(),
    context: ContextSchema.nullable().optional(),
    timestamp: z.number().optional(),
    progress_ms: z.number().nullable().optional(),
    is_playing: z.boolean().optional(),
    item: z.union([TrackSchema, EpisodeSchema]).nullable().optional(),
    currently_playing_type: z.string().optional(),
    actions: z
        .object({
            disallows: z.record(z.string(), z.boolean()).optional()
        })
        .optional()
});

const action = createAction({
    description: "Fetch the user's current playback state including device, track, and progress.",
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-current-playback',
        group: 'Player'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-read-playback-state'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/get-information-about-the-users-current-playback
        const response = await nango.get({
            endpoint: '/v1/me/player',
            params: {
                ...(input.market !== undefined && { market: input.market }),
                ...(input.additional_types !== undefined && { additional_types: input.additional_types })
            },
            retries: 3
        });

        // 204 means no active playback session
        if (response.status === 204) {
            return {
                is_playing: false,
                item: null,
                progress_ms: null
            };
        }

        const playback = CurrentlyPlayingSchema.parse(response.data);

        return {
            device: playback.device,
            repeat_state: playback.repeat_state,
            shuffle_state: playback.shuffle_state,
            context: playback.context,
            timestamp: playback.timestamp,
            progress_ms: playback.progress_ms,
            is_playing: playback.is_playing,
            item: playback.item,
            currently_playing_type: playback.currently_playing_type,
            actions: playback.actions
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
