import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().optional().describe('Number of workflow states to return. Defaults to 50.'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    orderBy: z.string().optional().describe('Order by field. Example: "updatedAt", "createdAt".'),
    filter: z
        .object({
            teamId: z.string().optional().describe('Filter by team ID.')
        })
        .optional()
        .describe('Filter options for workflow states.')
});

const WorkflowStateSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    color: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    position: z.number().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    team: z
        .object({
            id: z.string(),
            key: z.string(),
            name: z.string()
        })
        .nullable()
        .optional()
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            workflowStates: z
                .object({
                    nodes: z.array(z.unknown()),
                    pageInfo: z.unknown()
                })
                .nullable()
                .optional()
        })
        .nullable()
        .optional()
});

const ListOutputSchema = z.object({
    items: z.array(WorkflowStateSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List Linear workflow states across teams.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-workflow-states',
        group: 'Workflow States'
    },
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const filterParts: string[] = [];
        if (input.filter?.teamId) {
            filterParts.push(`team: { id: { eq: "${input.filter.teamId}" } }`);
        }
        const filterString = filterParts.length > 0 ? `filter: { ${filterParts.join(', ')} }` : '';

        const firstArg = input.first !== undefined ? `first: ${input.first}` : '';
        const afterArg = input.after ? `after: "${input.after}"` : '';
        const orderByArg = input.orderBy ? `orderBy: ${input.orderBy}` : '';

        const args = [firstArg, afterArg, orderByArg, filterString].filter(Boolean).join(', ');
        const argClause = args ? `(${args})` : '';

        const query = `{
            workflowStates${argClause} {
                nodes {
                    id
                    name
                    type
                    color
                    description
                    position
                    createdAt
                    updatedAt
                    team {
                        id
                        key
                        name
                    }
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }`;

        // https://linear.app/developers/graphql
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: query.replace(/\s+/g, ' ').trim()
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const workflowStates = parsed.data?.workflowStates;

        if (!workflowStates || !Array.isArray(workflowStates.nodes)) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Linear API: workflowStates or nodes missing'
            });
        }

        const items = workflowStates.nodes.map((node) => {
            const state = WorkflowStateSchema.parse(node);
            return {
                id: state.id,
                name: state.name,
                type: state.type,
                ...(state.color !== null && state.color !== undefined && { color: state.color }),
                ...(state.description !== null && state.description !== undefined && { description: state.description }),
                ...(state.position !== null && state.position !== undefined && { position: state.position }),
                ...(state.createdAt !== null && state.createdAt !== undefined && { createdAt: state.createdAt }),
                ...(state.updatedAt !== null && state.updatedAt !== undefined && { updatedAt: state.updatedAt }),
                ...(state.team !== null &&
                    state.team !== undefined && {
                        team: {
                            id: state.team.id,
                            key: state.team.key,
                            name: state.team.name
                        }
                    })
            };
        });

        const pageInfo = PageInfoSchema.parse(workflowStates.pageInfo);

        return {
            items,
            ...(pageInfo.hasNextPage && pageInfo.endCursor ? { nextCursor: pageInfo.endCursor } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
