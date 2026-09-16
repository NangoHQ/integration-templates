import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of teams to return per page. Must be between 1 and 100.'),
        query: z.string().optional().describe('Query string to filter teams by name.')
    })
    .describe('Input for listing teams on the PagerDuty account.');

const ProviderTeamSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    type: z.string().optional(),
    summary: z.string().optional(),
    self: z.string().optional(),
    html_url: z.string().optional()
});

const TeamSchema = z.object({
    id: z.string().describe('Unique identifier for the team.'),
    name: z.string().describe('Name of the team.'),
    description: z.string().optional().describe('Description of the team.')
});

const OutputSchema = z
    .object({
        teams: z.array(TeamSchema).describe('List of teams on the account.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page. Omitted when there are no more pages.')
    })
    .describe('Output containing the list of teams and optional pagination cursor.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of teams from the PagerDuty account.
 */
const action = createAction({
    description: 'List teams on the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['teams.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer offset string.'
            });
        }

        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

        // https://developer.pagerduty.com/api-reference/e68b1455cc9bd-list-teams
        const response = await nango.get({
            endpoint: '/teams',
            params: {
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(offset > 0 && { offset: String(offset) }),
                ...(input.query !== undefined && { query: input.query })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                teams: z.array(z.unknown()),
                limit: z.number(),
                offset: z.number(),
                more: z.boolean()
            })
            .parse(response.data);

        const teams = providerResponse.teams.map((item) => {
            const team = ProviderTeamSchema.parse(item);
            return {
                id: team.id,
                name: team.name,
                ...(team.description != null && { description: team.description })
            };
        });

        const nextOffset = providerResponse.offset + providerResponse.limit;
        const nextCursor = providerResponse.more ? String(nextOffset) : undefined;

        return {
            teams,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
