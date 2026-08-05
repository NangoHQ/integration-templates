import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    first: z.number().optional().describe('Number of items to return per page. Default: 50.'),
    teamId: z.string().optional().describe('Filter cycles by team ID.'),
    filter: z.record(z.string(), z.unknown()).optional().describe('Cycle filter object. Example: { team: { id: { eq: "team-id" } } }'),
    orderBy: z.string().optional().describe('Order by field. Example: "updatedAt" or "createdAt"')
});

const ProviderTeamSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional()
});

const ProviderCycleNodeSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    number: z.number(),
    startsAt: z.string().nullable().optional(),
    endsAt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    completedAt: z.string().nullable().optional(),
    team: ProviderTeamSchema,
    progress: z.number().nullable().optional()
});

const ProviderPageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable().optional()
});

const ProviderCyclesResponseSchema = z.object({
    data: z.object({
        cycles: z.object({
            nodes: z.array(z.unknown()),
            pageInfo: ProviderPageInfoSchema
        })
    })
});

const OutputCycleSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    number: z.number(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    completedAt: z.string().optional(),
    team: z.object({
        id: z.string(),
        name: z.string().optional()
    }),
    progress: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputCycleSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List Linear cycles with filtering and pagination.',
    version: '1.0.3',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const first = input.first ?? 50;

        const filter: Record<string, unknown> = { ...(input.filter ?? {}) };
        if (input.teamId && !('team' in filter)) {
            filter['team'] = { id: { eq: input.teamId } };
        }

        const variables: Record<string, unknown> = {
            first,
            orderBy: input.orderBy ?? 'updatedAt'
        };
        if (input.cursor) {
            variables['after'] = input.cursor;
        }
        if (Object.keys(filter).length > 0) {
            variables['filter'] = filter;
        }

        const response = await nango.post({
            // https://linear.app/developers/graphql
            endpoint: '/graphql',
            data: {
                query: `
                    query Cycles($first: Int!, $after: String, $filter: CycleFilter, $orderBy: PaginationOrderBy) {
                        cycles(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
                            nodes {
                                id
                                name
                                number
                                startsAt
                                endsAt
                                createdAt
                                updatedAt
                                completedAt
                                team {
                                    id
                                    name
                                }
                                progress
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

        const parsed = ProviderCyclesResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response structure from Linear API',
                details: parsed.error.message
            });
        }

        const { nodes, pageInfo } = parsed.data.data.cycles;

        const items = nodes.map((node) => {
            const cycle = ProviderCycleNodeSchema.safeParse(node);
            if (!cycle.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid cycle node in response',
                    details: cycle.error.message
                });
            }

            const c = cycle.data;
            return {
                id: c.id,
                ...(c.name != null && { name: c.name }),
                number: c.number,
                ...(c.startsAt != null && { startsAt: c.startsAt }),
                ...(c.endsAt != null && { endsAt: c.endsAt }),
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
                ...(c.completedAt != null && { completedAt: c.completedAt }),
                team: {
                    id: c.team.id,
                    ...(c.team.name != null && { name: c.team.name })
                },
                ...(c.progress != null && { progress: c.progress })
            };
        });

        return {
            items,
            ...(pageInfo.hasNextPage && pageInfo.endCursor && { nextCursor: pageInfo.endCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
