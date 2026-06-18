import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    limit: z.number().optional().describe('Maximum number of playlists to return. Default: 20, Max: 50.'),
    offset: z.number().optional().describe('The index of the first playlist to return. Default: 0.')
});

const PlaylistOwnerSchema = z.object({
    id: z.string(),
    display_name: z.string().nullable().optional()
});

const PlaylistItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    owner: PlaylistOwnerSchema,
    public: z.boolean().nullable().optional(),
    collaborative: z.boolean().optional(),
    href: z.string().optional(),
    uri: z.string().optional(),
    tracks: z
        .object({
            href: z.string(),
            total: z.number()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(PlaylistItemSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    next: z.string().nullable().optional(),
    previous: z.string().nullable().optional()
});

const OutputPlaylistSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    owner_id: z.string(),
    owner_name: z.string().optional(),
    public: z.boolean().optional(),
    collaborative: z.boolean().optional(),
    href: z.string().optional(),
    uri: z.string().optional(),
    tracks_total: z.number().optional()
});

const OutputSchema = z.object({
    playlists: z.array(OutputPlaylistSchema),
    total: z.number(),
    next_offset: z.number().optional()
});

const action = createAction({
    description: 'List playlists owned or followed by the current user.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['playlist-read-private', 'playlist-read-collaborative'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/get-a-list-of-current-users-playlists
        const response = await nango.get({
            endpoint: '/v1/me/playlists',
            params: {
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.offset !== undefined && { offset: String(input.offset) })
            },
            retries: 3
        });

        const validated = ProviderResponseSchema.parse(response.data);

        const playlists = validated.items.map((item) => ({
            id: item.id,
            name: item.name,
            ...(item.description != null && { description: item.description }),
            owner_id: item.owner.id,
            ...(item.owner.display_name != null && { owner_name: item.owner.display_name }),
            ...(item.public != null && { public: item.public }),
            ...(item.collaborative !== undefined && { collaborative: item.collaborative }),
            ...(item.href !== undefined && { href: item.href }),
            ...(item.uri !== undefined && { uri: item.uri }),
            ...(item.tracks !== undefined && { tracks_total: item.tracks.total })
        }));

        return {
            playlists,
            total: validated.total,
            ...(validated.next !== null &&
                validated.next !== undefined && {
                    next_offset: validated.offset + validated.limit
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
