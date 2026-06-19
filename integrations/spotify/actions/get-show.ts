import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The Spotify ID for the show. Example: "18WzIf6SqovUQHHTeZaucQ"'),
    market: z
        .string()
        .optional()
        .describe('An ISO 3166-1 alpha-2 country code. If a country code is specified, only content that is available in that market will be returned.')
});

const ShowSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    html_description: z.string().optional(),
    publisher: z.string().optional(),
    images: z
        .array(
            z.object({
                url: z.string(),
                height: z.number().nullable(),
                width: z.number().nullable()
            })
        )
        .optional(),
    explicit: z.boolean().optional(),
    type: z.literal('show'),
    available_markets: z.array(z.string()).optional(),
    total_episodes: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    publisher: z.string().optional(),
    images: z
        .array(
            z.object({
                url: z.string(),
                height: z.number().optional(),
                width: z.number().optional()
            })
        )
        .optional(),
    explicit: z.boolean().optional(),
    total_episodes: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a single show (podcast) from the Spotify catalog',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/get-a-show
        const config: {
            endpoint: string;
            params?: { market: string };
            retries: number;
        } = {
            endpoint: `/v1/shows/${encodeURIComponent(input.id)}`,
            retries: 3
        };
        if (input.market) {
            config.params = { market: input.market };
        }
        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Show not found',
                id: input.id
            });
        }

        const providerShow = ShowSchema.parse(response.data);

        return {
            id: providerShow.id,
            name: providerShow.name,
            description: providerShow.description,
            ...(providerShow.publisher !== undefined && { publisher: providerShow.publisher }),
            ...(providerShow.images !== undefined && {
                images: providerShow.images.map((img) => ({
                    url: img.url,
                    ...(img.height !== null && { height: img.height }),
                    ...(img.width !== null && { width: img.width })
                }))
            }),
            ...(providerShow.explicit !== undefined && { explicit: providerShow.explicit }),
            ...(providerShow.total_episodes !== undefined && { total_episodes: providerShow.total_episodes })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
