import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(100).optional().describe('Number of items to fetch. Default: 50. Max: 100.'),
    after: z.string().optional().describe('Pagination cursor from previous pageInfo.endCursor. Omit for first page.'),
    filter: z.record(z.string(), z.unknown()).optional().describe('Cycle filter object (e.g., { team: { id: { eq: "team-id" } } }).'),
    orderBy: z.string().optional().describe('Order cycles by field. Options: createdAt, updatedAt, name, startDate, endDate, completedAt. Default: createdAt.')
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.union([z.string(), z.null()])
});

const TeamSchema = z.object({
    id: z.string(),
    name: z.string()
});

const CycleSchema = z.object({
    id: z.string(),
    name: z.string(),
    number: z.number().int(),
    startsAt: z.union([z.string(), z.null()]),
    endsAt: z.union([z.string(), z.null()]),
    completedAt: z.union([z.string(), z.null()]),
    createdAt: z.string(),
    updatedAt: z.string(),
    team: TeamSchema.optional()
});

const OutputSchema = z.object({
    cycles: z.array(CycleSchema),
    pageInfo: PageInfoSchema
});

const ResponsePageInfoSchema = z.object({
    hasNextPage: z.boolean().optional(),
    endCursor: z.union([z.string(), z.null()]).optional()
});

const ResponseTeamSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional()
});

const ResponseCycleSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    number: z.number().optional(),
    startsAt: z.union([z.string(), z.null()]).optional(),
    endsAt: z.union([z.string(), z.null()]).optional(),
    completedAt: z.union([z.string(), z.null()]).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    team: ResponseTeamSchema.optional()
});

const CyclesConnectionSchema = z.object({
    nodes: z.array(z.unknown()).optional(),
    pageInfo: ResponsePageInfoSchema.optional()
});

const GraphQLDataSchema = z.object({
    cycles: CyclesConnectionSchema.optional()
});

const GraphQLResponseSchema = z.object({
    data: GraphQLDataSchema.optional(),
    errors: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'List Linear cycles with filtering and pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-cycles',
        group: 'Cycles'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query Cycles($first: Int, $after: String, $filter: CycleFilter, $orderBy: PaginationOrderBy) {
                cycles(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
                    nodes {
                        id
                        name
                        number
                        startsAt
                        endsAt
                        completedAt
                        createdAt
                        updatedAt
                        team {
                            id
                            name
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `;

        const variables: Record<string, unknown> = {};
        if (input['first'] !== undefined) {
            variables['first'] = input['first'];
        }
        if (input['after'] !== undefined && input['after'] !== '') {
            variables['after'] = input['after'];
        }
        if (input['filter'] !== undefined && Object.keys(input['filter']).length > 0) {
            variables['filter'] = input['filter'];
        }
        if (input['orderBy'] !== undefined && input['orderBy'] !== '') {
            variables['orderBy'] = input['orderBy'];
        }

        // https://developers.linear.app/docs/graphql/working-with-the-graphql-api
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query,
                variables
            },
            retries: 3
        });

        const parseResult = GraphQLResponseSchema.safeParse(response.data);
        if (!parseResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Linear API',
                error: parseResult.error.message
            });
        }

        const data = parseResult.data;

        if (data.errors && data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL query failed',
                errors: data.errors
            });
        }

        const cyclesData = data.data?.cycles;
        if (!cyclesData) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Linear API'
            });
        }

        const cycles = Array.isArray(cyclesData.nodes) ? cyclesData.nodes : [];
        const pageInfo = cyclesData.pageInfo || { hasNextPage: false, endCursor: null };

        return {
            cycles: cycles.map((cycle) => {
                const cycleResult = ResponseCycleSchema.safeParse(cycle);
                const cycleNode = cycleResult.success ? cycleResult.data : {};
                const teamResult = ResponseTeamSchema.safeParse(cycleNode.team);
                const teamData = teamResult.success ? teamResult.data : undefined;
                return {
                    id: cycleNode.id ?? '',
                    name: cycleNode.name ?? '',
                    number: cycleNode.number ?? 0,
                    startsAt: cycleNode.startsAt ?? null,
                    endsAt: cycleNode.endsAt ?? null,
                    completedAt: cycleNode.completedAt ?? null,
                    createdAt: cycleNode.createdAt ?? '',
                    updatedAt: cycleNode.updatedAt ?? '',
                    team: teamData
                        ? {
                              id: teamData.id ?? '',
                              name: teamData.name ?? ''
                          }
                        : undefined
                };
            }),
            pageInfo: {
                hasNextPage: pageInfo.hasNextPage ?? false,
                endCursor: pageInfo.endCursor ?? null
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
