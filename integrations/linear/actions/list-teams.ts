import { z } from 'zod';
import { createAction } from 'nango';

const TeamNodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    key: z.string().optional(),
    description: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable().optional()
});

const TeamsConnectionSchema = z.object({
    nodes: z.array(TeamNodeSchema),
    pageInfo: PageInfoSchema
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        teams: TeamsConnectionSchema
    })
});

const InputSchema = z.object({
    first: z.number().optional().describe('Number of teams to return per page. Default: 50.'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const TeamOutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    key: z.string().optional(),
    description: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(TeamOutputSchema),
    nextCursor: z.string().optional()
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
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query Teams($first: Int, $after: String) {
                teams(first: $first, after: $after) {
                    nodes {
                        id
                        name
                        key
                        description
                        createdAt
                        updatedAt
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `;

        // https://linear.app/developers/graphql
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query,
                variables: {
                    ...(input.first !== undefined && { first: input.first }),
                    ...(input.after !== undefined && { after: input.after })
                }
            },
            retries: 3
        });

        const parsed = GraphQLResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Linear GraphQL API.',
                details: parsed.error.issues
            });
        }

        const teams = parsed.data.data.teams;
        const items = teams.nodes.map((node) => ({
            id: node.id,
            name: node.name,
            ...(node.key !== undefined && { key: node.key }),
            ...(node.description != null && { description: node.description }),
            ...(node.createdAt !== undefined && { createdAt: node.createdAt }),
            ...(node.updatedAt !== undefined && { updatedAt: node.updatedAt })
        }));

        const nextCursor = teams.pageInfo.hasNextPage && teams.pageInfo.endCursor != null ? teams.pageInfo.endCursor : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
