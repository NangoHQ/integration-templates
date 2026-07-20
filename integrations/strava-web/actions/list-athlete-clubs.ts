import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().int().min(1).max(200).optional().describe('Number of items per page. Defaults to 30.')
});

const ProviderClubSchema = z.object({
    id: z.number(),
    resource_state: z.number().optional(),
    name: z.string().optional(),
    profile_medium: z.string().optional(),
    profile: z.string().optional(),
    cover_photo: z.string().optional(),
    cover_photo_small: z.string().optional(),
    sport_type: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    private: z.boolean().optional(),
    member_count: z.number().optional(),
    featured: z.boolean().optional(),
    verified: z.boolean().optional(),
    url: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderClubSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List athlete clubs.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer representing a page number'
            });
        }

        const perPage = input.per_page ?? 30;

        const config: ProxyConfiguration = {
            // https://developers.strava.com/docs/reference/#api-Clubs-getLoggedInAthleteClubs
            endpoint: '/api/v3/athlete/clubs',
            params: {
                page: page,
                per_page: perPage
            },
            retries: 3
        };

        const response = await nango.get(config);

        const rawData = z.array(z.unknown()).parse(response.data);
        const items = rawData.map((item) => ProviderClubSchema.parse(item));
        const nextCursor = items.length === perPage ? String(page + 1) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
