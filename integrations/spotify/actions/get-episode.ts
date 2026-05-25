import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The Spotify ID for the episode. Example: "0AYabmryUy29iVTvK45dLw"'),
    market: z.string().optional().describe('An ISO 3166-1 alpha-2 country code. If specified, only content available in that market will be returned.')
});

const ProviderEpisodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    html_description: z.string().optional(),
    duration_ms: z.number(),
    explicit: z.boolean(),
    href: z.string(),
    uri: z.string(),
    type: z.literal('episode'),
    release_date: z.string().optional(),
    release_date_precision: z.enum(['year', 'month', 'day']).optional(),
    audio_preview_url: z.string().nullable().optional(),
    images: z
        .array(
            z.object({
                url: z.string(),
                height: z.number().nullable(),
                width: z.number().nullable()
            })
        )
        .optional(),
    show: z
        .object({
            id: z.string(),
            name: z.string(),
            href: z.string(),
            uri: z.string()
        })
        .optional(),
    language: z.string().optional(),
    languages: z.array(z.string()).optional(),
    is_playable: z.boolean().optional(),
    resume_point: z
        .object({
            fully_played: z.boolean(),
            resume_position_ms: z.number()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    htmlDescription: z.string().optional(),
    durationMs: z.number(),
    explicit: z.boolean(),
    href: z.string(),
    uri: z.string(),
    type: z.literal('episode'),
    releaseDate: z.string().optional(),
    releaseDatePrecision: z.enum(['year', 'month', 'day']).optional(),
    audioPreviewUrl: z.string().optional(),
    images: z
        .array(
            z.object({
                url: z.string(),
                height: z.number().optional(),
                width: z.number().optional()
            })
        )
        .optional(),
    show: z
        .object({
            id: z.string(),
            name: z.string(),
            href: z.string(),
            uri: z.string()
        })
        .optional(),
    language: z.string().optional(),
    languages: z.array(z.string()).optional(),
    isPlayable: z.boolean().optional(),
    resumePoint: z
        .object({
            fullyPlayed: z.boolean(),
            resumePositionMs: z.number()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve a single podcast episode from the Spotify catalog.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-episode',
        group: 'Episodes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.market !== undefined) {
            params['market'] = input.market;
        }

        const response = await nango.get({
            // https://developer.spotify.com/documentation/web-api/reference/get-an-episode
            endpoint: `/v1/episodes/${encodeURIComponent(input.id)}`,
            params: params,
            retries: 3
        });

        const providerEpisode = ProviderEpisodeSchema.parse(response.data);

        return {
            id: providerEpisode.id,
            name: providerEpisode.name,
            ...(providerEpisode.description !== undefined && { description: providerEpisode.description }),
            ...(providerEpisode.html_description !== undefined && { htmlDescription: providerEpisode.html_description }),
            durationMs: providerEpisode.duration_ms,
            explicit: providerEpisode.explicit,
            href: providerEpisode.href,
            uri: providerEpisode.uri,
            type: providerEpisode.type,
            ...(providerEpisode.release_date !== undefined && { releaseDate: providerEpisode.release_date }),
            ...(providerEpisode.release_date_precision !== undefined && { releaseDatePrecision: providerEpisode.release_date_precision }),
            ...(providerEpisode.audio_preview_url != null && { audioPreviewUrl: providerEpisode.audio_preview_url }),
            ...(providerEpisode.images !== undefined && {
                images: providerEpisode.images.map((img) => ({
                    url: img.url,
                    ...(img.height != null && { height: img.height }),
                    ...(img.width != null && { width: img.width })
                }))
            }),
            ...(providerEpisode.show !== undefined && {
                show: {
                    id: providerEpisode.show.id,
                    name: providerEpisode.show.name,
                    href: providerEpisode.show.href,
                    uri: providerEpisode.show.uri
                }
            }),
            ...(providerEpisode.language !== undefined && { language: providerEpisode.language }),
            ...(providerEpisode.languages !== undefined && { languages: providerEpisode.languages }),
            ...(providerEpisode.is_playable !== undefined && { isPlayable: providerEpisode.is_playable }),
            ...(providerEpisode.resume_point !== undefined && {
                resumePoint: {
                    fullyPlayed: providerEpisode.resume_point.fully_played,
                    resumePositionMs: providerEpisode.resume_point.resume_position_ms
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
