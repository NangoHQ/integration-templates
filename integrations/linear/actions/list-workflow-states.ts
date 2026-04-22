import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().optional().describe('Number of workflow states to return. Default: 50'),
    after: z.string().optional().describe('Pagination cursor from the previous response.'),
    team_id: z.string().optional().describe('Filter by team ID. Example: "abc123-def456"'),
    order_by: z.enum(['createdAt', 'updatedAt']).optional().describe('Field to order by. Allowed values: createdAt, updatedAt')
});

const WorkflowStateSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    type: z.string(),
    description: z.union([z.string(), z.null()]).optional(),
    position: z.number(),
    team: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(WorkflowStateSchema),
    next_cursor: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'List Linear workflow states across teams',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-workflow-states',
        group: 'Workflow States'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query WorkflowStates($first: Int, $after: String, $filter: WorkflowStateFilter, $orderBy: PaginationOrderBy) {
                workflowStates(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
                    nodes {
                        id
                        name
                        color
                        type
                        description
                        position
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

        const variables: Record<string, unknown> = {
            first: input.first ?? 50
        };

        if (input.after) {
            variables['after'] = input.after;
        }

        if (input.team_id) {
            variables['filter'] = {
                team: {
                    id: {
                        eq: input.team_id
                    }
                }
            };
        }

        if (input.order_by) {
            variables['orderBy'] = input.order_by;
        }

        // https://developers.linear.app/docs/graphql/workflow-states
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query,
                variables
            },
            retries: 3
        });

        if (!response.data || !response.data.data || !response.data.data.workflowStates) {
            return {
                items: [],
                next_cursor: null
            };
        }

        const workflowStates = response.data.data.workflowStates;
        const nodes = workflowStates.nodes || [];
        const pageInfo = workflowStates.pageInfo || {};

        return {
            items: nodes.map(
                (node: {
                    id: string;
                    name: string;
                    color?: string;
                    type: string;
                    description?: string | null;
                    position: number;
                    team?: { id: string; name: string };
                }) => ({
                    id: node.id,
                    name: node.name,
                    color: node.color,
                    type: node.type,
                    description: node.description ?? null,
                    position: node.position,
                    team: node.team
                })
            ),
            next_cursor: pageInfo.hasNextPage && pageInfo.endCursor ? pageInfo.endCursor : null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
