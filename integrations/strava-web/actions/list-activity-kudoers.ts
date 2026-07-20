import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    activity_id: z.number().int().describe('Activity ID. Example: 19350154255'),
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().int().min(1).max(200).optional().describe('Number of items per page. Default: 30.')
});

const AthleteSchema = z
    .object({
        id: z.number(),
        firstname: z.string().optional(),
        lastname: z.string().optional(),
        profile: z.string().optional(),
        profile_medium: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        sex: z.string().optional(),
        premium: z.boolean().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(AthleteSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List the athletes who gave kudos on an activity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['activity:read'],

    exec: async (nango, input) => {
        const page = input.cursor !== undefined ? Number(input.cursor) : 1;
        if (input.cursor !== undefined && (!Number.isInteger(page) || page < 1)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer representing a page number'
            });
        }

        const perPage = input.per_page ?? 30;

        // https://developers.strava.com/docs/reference/#api-Activities-getKudoersByActivityId
        const response = await nango.get({
            endpoint: '/api/v3/activities/' + encodeURIComponent(String(input.activity_id)) + '/kudos',
            params: {
                page,
                per_page: perPage
            },
            retries: 3
        });

        const kudoers = z.array(AthleteSchema).parse(response.data);
        const nextCursor = kudoers.length === perPage ? String(page + 1) : undefined;

        return {
            items: kudoers,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
