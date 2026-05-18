import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z
        .string()
        .optional()
        .describe('Pagination cursor from the previous response. For Microsoft Graph, this is the full @odata.nextLink URL. Omit for the first page.')
});

const ProviderTeamSchema = z.object({
    id: z.string(),
    displayName: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    visibility: z.string().nullable().optional(),
    isArchived: z.boolean().optional()
});

const TeamSchema = z.object({
    id: z.string().describe('The unique identifier of the team'),
    display_name: z.string().optional().describe('The display name of the team'),
    description: z.string().optional().describe('The description of the team'),
    visibility: z.string().optional().describe('The visibility of the team'),
    is_archived: z.boolean().optional().describe('Whether the team is archived')
});

const ListOutputSchema = z.object({
    items: z.array(TeamSchema),
    next_cursor: z.string().optional().describe('The full @odata.nextLink URL for fetching the next page, if more results exist')
});

const action = createAction({
    description: 'List teams the user has joined',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-joined-teams',
        group: 'Teams'
    },
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['Team.ReadBasic.All', 'TeamSettings.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/user-list-joinedteams
        // Note: /me/joinedTeams does not support $top query parameter
        const response = await nango.get({
            endpoint: input.cursor || '/v1.0/me/joinedTeams',
            retries: 3
        });

        const TeamsResponseSchema = z.object({
            value: z.array(ProviderTeamSchema),
            '@odata.nextLink': z.string().optional()
        });

        const parsed = TeamsResponseSchema.parse(response.data);

        const items = parsed.value.map((team) => ({
            id: team.id,
            ...(team.displayName != null && { display_name: team.displayName }),
            ...(team.description != null && { description: team.description }),
            ...(team.visibility != null && { visibility: team.visibility }),
            ...(team.isArchived != null && { is_archived: team.isArchived })
        }));

        return {
            items,
            ...(parsed['@odata.nextLink'] != null && { next_cursor: parsed['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
