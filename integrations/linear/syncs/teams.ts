import { createSync } from 'nango';
import { z } from 'zod';

const TeamSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    key: z.string().optional(),
    description: z.string().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
    private: z.boolean().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    archivedAt: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        teams: z.object({
            nodes: z.array(
                z.object({
                    id: z.string(),
                    name: z.string().nullish(),
                    key: z.string().nullish(),
                    description: z.string().nullish(),
                    color: z.string().nullish(),
                    icon: z.string().nullish(),
                    private: z.boolean().nullish(),
                    createdAt: z.string().nullish(),
                    updatedAt: z.string().nullish(),
                    archivedAt: z.string().nullish()
                })
            ),
            pageInfo: z.object({
                hasNextPage: z.boolean(),
                endCursor: z.string().nullish()
            })
        })
    })
});

type TeamVariables = {
    first: number;
    orderBy: string;
    filter?: { updatedAt: { gte: string } };
    after?: string;
};

const sync = createSync({
    description: 'Sync Linear teams visible to the authenticated user.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'GET', path: '/syncs/teams' }],
    models: {
        Team: TeamSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : undefined;

        let cursor: string | undefined;
        let isFirstPage = true;
        let highWaterMark: string | undefined;

        while (true) {
            const variables: TeamVariables = {
                first: 100,
                orderBy: 'updatedAt'
            };

            if (checkpoint?.updated_after) {
                variables.filter = { updatedAt: { gte: checkpoint.updated_after } };
            }

            if (cursor) {
                variables.after = cursor;
            }

            const response = await nango.post({
                // https://linear.app/developers
                endpoint: '/graphql',
                data: {
                    query: `
                        query Teams($filter: TeamFilter, $after: String, $first: Int, $orderBy: PaginationOrderBy) {
                            teams(filter: $filter, after: $after, first: $first, orderBy: $orderBy) {
                                nodes {
                                    id
                                    name
                                    key
                                    description
                                    color
                                    icon
                                    private
                                    createdAt
                                    updatedAt
                                    archivedAt
                                }
                                pageInfo {
                                    hasNextPage
                                    endCursor
                                }
                            }
                        }
                    `,
                    variables
                },
                retries: 3
            });

            const parsed = GraphQLResponseSchema.parse(response.data);
            const teams = parsed.data.teams.nodes;
            const pageInfo = parsed.data.teams.pageInfo;

            if (!Array.isArray(teams)) {
                throw new Error('Expected teams.nodes to be an array');
            }

            if (teams.length === 0) {
                break;
            }

            const mappedTeams = teams.map((team) => ({
                id: team.id,
                ...(team.name != null && { name: team.name }),
                ...(team.key != null && { key: team.key }),
                ...(team.description != null && { description: team.description }),
                ...(team.color != null && { color: team.color }),
                ...(team.icon != null && { icon: team.icon }),
                ...(team.private != null && { private: team.private }),
                ...(team.createdAt != null && { createdAt: team.createdAt }),
                ...(team.updatedAt != null && { updatedAt: team.updatedAt }),
                ...(team.archivedAt != null && { archivedAt: team.archivedAt })
            }));

            await nango.batchSave(mappedTeams, 'Team');

            const firstTeam = mappedTeams[0];
            if (isFirstPage && firstTeam && firstTeam.updatedAt) {
                highWaterMark = firstTeam.updatedAt;
                isFirstPage = false;
            }

            if (!pageInfo.hasNextPage || !pageInfo.endCursor) {
                break;
            }

            cursor = pageInfo.endCursor;
        }

        if (highWaterMark) {
            await nango.saveCheckpoint({ updated_after: highWaterMark });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
