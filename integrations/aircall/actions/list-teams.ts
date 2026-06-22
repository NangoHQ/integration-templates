import { z } from 'zod';
import { createAction } from 'nango';

const TeamUserSchema = z.object({
    id: z.number(),
    direct_link: z.string(),
    name: z.string(),
    email: z.string(),
    availability_status: z.string().optional(),
    default_number_id: z.number().optional(),
    created_at: z.string(),
    time_zone: z.string()
});

const TeamSchema = z.object({
    id: z.number(),
    name: z.string(),
    direct_link: z.string(),
    created_at: z.string(),
    users: z.array(TeamUserSchema)
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().optional().describe('Number of results per page. Max 50.')
});

const OutputSchema = z.object({
    teams: z.array(TeamSchema),
    next_cursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    meta: z.object({
        count: z.number(),
        total: z.number(),
        current_page: z.number(),
        per_page: z.number(),
        next_page_link: z.string().nullable(),
        previous_page_link: z.string().nullable()
    }),
    teams: z.array(TeamSchema)
});

const action = createAction({
    description: 'List teams from Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/list-teams',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer page number'
            });
        }

        const perPage = input.per_page ?? 20;
        if (perPage < 1 || perPage > 50) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'per_page must be between 1 and 50'
            });
        }

        const response = await nango.get({
            // https://developer.aircall.io/api-references/#list-all-teams
            endpoint: '/v1/teams',
            params: {
                page: String(page),
                per_page: String(perPage),
                order: 'asc'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const nextCursor = providerResponse.meta.next_page_link != null ? String(providerResponse.meta.current_page + 1) : undefined;

        return {
            teams: providerResponse.teams,
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
