import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().optional().describe('Number of teams to fetch. Example: 10'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const PageInfoSchema = z.object({
    has_next_page: z.boolean(),
    end_cursor: z.union([z.string(), z.null()])
});

const TeamSchema = z.object({
    id: z.string(),
    name: z.string(),
    key: z.string(),
    description: z.union([z.string(), z.null()]),
    color: z.union([z.string(), z.null()]),
    private: z.boolean(),
    archived_at: z.union([z.string(), z.null()]),
    created_at: z.string()
});

const OutputSchema = z.object({
    teams: z.array(TeamSchema),
    page_info: PageInfoSchema
});

const action = createAction({
    description: 'List Linear teams available to the authenticated user.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-teams',
        group: 'Teams'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const first = input.first ?? 50;

        // https://linear.app/docs/api/teams
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    query Teams($first: Int, $after: String) {
                        teams(first: $first, after: $after) {
                            nodes {
                                id
                                name
                                key
                                description
                                color
                                private
                                archivedAt
                                createdAt
                            }
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }
                `,
                variables: {
                    first,
                    after: input.after
                }
            },
            retries: 3
        });

        if (!response.data || !response.data.data || !response.data.data.teams) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Linear API'
            });
        }

        const teamsData = response.data.data.teams;

        return {
            teams: teamsData.nodes.map(
                (team: {
                    id: string;
                    name: string;
                    key: string;
                    description: string | null;
                    color: string | null;
                    private: boolean;
                    archivedAt: string | null;
                    createdAt: string;
                }) => ({
                    id: team.id,
                    name: team.name,
                    key: team.key,
                    description: team.description ?? null,
                    color: team.color ?? null,
                    private: team.private,
                    archived_at: team.archivedAt ?? null,
                    created_at: team.createdAt
                })
            ),
            page_info: {
                has_next_page: teamsData.pageInfo.hasNextPage,
                end_cursor: teamsData.pageInfo.endCursor || null
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
