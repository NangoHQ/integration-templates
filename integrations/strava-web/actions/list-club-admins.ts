import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The identifier of the club. Example: 1'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().optional().describe('Number of items per page. Defaults to 30.')
});

const SummaryAthleteSchema = z.object({
    id: z.number(),
    resource_state: z.number(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    profile_medium: z.string().optional(),
    profile: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    sex: z.string().optional(),
    premium: z.boolean().optional(),
    summit: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(SummaryAthleteSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: "List a club's administrators.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        const perPage = input.per_page ?? 30;

        const response = await nango.get({
            // https://developers.strava.com/docs/reference/#api-Clubs-getClubAdminsById
            endpoint: `/api/v3/clubs/${encodeURIComponent(input.id)}/admins`,
            params: {
                page: page,
                per_page: perPage
            },
            retries: 3
        });

        const rawItems = z.array(z.unknown()).parse(response.data);

        const items = rawItems.map((item: unknown) => {
            const parsed = SummaryAthleteSchema.parse(item);
            return {
                id: parsed.id,
                resource_state: parsed.resource_state,
                ...(parsed.firstname !== undefined && { firstname: parsed.firstname }),
                ...(parsed.lastname !== undefined && { lastname: parsed.lastname }),
                ...(parsed.profile_medium !== undefined && { profile_medium: parsed.profile_medium }),
                ...(parsed.profile !== undefined && { profile: parsed.profile }),
                ...(parsed.city !== undefined && { city: parsed.city }),
                ...(parsed.state !== undefined && { state: parsed.state }),
                ...(parsed.country !== undefined && { country: parsed.country }),
                ...(parsed.sex !== undefined && { sex: parsed.sex }),
                ...(parsed.premium !== undefined && { premium: parsed.premium }),
                ...(parsed.summit !== undefined && { summit: parsed.summit }),
                ...(parsed.created_at !== undefined && { created_at: parsed.created_at }),
                ...(parsed.updated_at !== undefined && { updated_at: parsed.updated_at })
            };
        });

        const hasNextPage = items.length === perPage;

        return {
            items,
            ...(hasNextPage && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
