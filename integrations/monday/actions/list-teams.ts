import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    ids: z.array(z.string()).optional().describe('Filter by specific team IDs.'),
    limit: z.number().optional().describe('Number of teams to return per page. Default: 25.')
});

const TeamUserSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const TeamSchema = z.object({
    id: z.string(),
    name: z.string(),
    picture_url: z.string().optional(),
    owners: z.array(TeamUserSchema).optional(),
    users: z.array(TeamUserSchema).optional()
});

const OutputSchema = z.object({
    teams: z.array(TeamSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List teams from monday.com.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['teams:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = Math.max(1, Math.floor(input.limit ?? 25));
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (input.cursor && (Number.isNaN(page) || !/^\d+$/.test(input.cursor) || page < 1)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer string'
            });
        }

        if (input.ids) {
            for (const id of input.ids) {
                if (!/^\d+$/.test(id)) {
                    throw new nango.ActionError({
                        type: 'invalid_input',
                        message: `Team ID must be numeric: ${id}`
                    });
                }
            }
        }

        const idsArg = input.ids && input.ids.length > 0 ? `ids: [${input.ids.join(', ')}]` : '';
        const args = idsArg ? `(${idsArg})` : '';

        const query = `
            query {
                teams${args} {
                    id
                    name
                    picture_url
                    owners {
                        id
                        name
                    }
                    users {
                        id
                        name
                    }
                }
            }
        `;

        // https://developer.monday.com/api-reference/reference/teams
        const response = await nango.post({
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query
            },
            retries: 3
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Invalid response from monday.com API'
            });
        }

        const parsedData = z
            .object({
                data: z.object({
                    teams: z.array(z.unknown())
                })
            })
            .safeParse(rawData);

        if (!parsedData.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response structure from monday.com API'
            });
        }

        const allTeams = parsedData.data.data.teams;
        const startIndex = (page - 1) * limit;
        const paginatedTeams = allTeams.slice(startIndex, startIndex + limit + 1);
        const hasMore = paginatedTeams.length > limit;
        const trimmedTeams = hasMore ? paginatedTeams.slice(0, limit) : paginatedTeams;

        const parsedTeams = trimmedTeams.map((team) => TeamSchema.parse(team));

        return {
            teams: parsedTeams,
            ...(hasMore && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
