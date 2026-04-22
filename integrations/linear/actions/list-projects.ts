import { z } from 'zod';
import { createAction } from 'nango';

// Input schema for list-projects action
// https://linear.app/developers/pagination
// https://linear.app/developers/filtering
const InputSchema = z.object({
    first: z.number().optional().describe('Number of projects to return (1-100). Default: 50.'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    filter: z.record(z.string(), z.unknown()).optional().describe('Filter object for projects (e.g., { name: { contains: "Project" } }).'),
    orderBy: z.enum(['createdAt', 'updatedAt', 'name']).optional().describe('Field to order results by. Default: createdAt.')
});

// Project schema based on Linear GraphQL Project type
const ProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    slugId: z.string(),
    description: z.union([z.string(), z.null()]),
    state: z.union([z.string(), z.null()]),
    progress: z.union([z.number(), z.null()]),
    startedAt: z.union([z.string(), z.null()]),
    targetDate: z.union([z.string(), z.null()]),
    createdAt: z.string(),
    updatedAt: z.string(),
    url: z.string()
});

// Output schema with pagination
const OutputSchema = z.object({
    projects: z.array(ProjectSchema),
    next_cursor: z.union([z.string(), z.null()]),
    has_more: z.boolean()
});

// Zod schema for validating the GraphQL response structure
const PageInfoSchema = z.object({
    hasNextPage: z.boolean().optional(),
    endCursor: z.union([z.string(), z.null()]).optional()
});

const ProjectNodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    slugId: z.string(),
    description: z.union([z.string(), z.null()]).optional(),
    state: z.union([z.string(), z.null()]).optional(),
    progress: z.union([z.number(), z.null()]).optional(),
    startedAt: z.union([z.string(), z.null()]).optional(),
    targetDate: z.union([z.string(), z.null()]).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    url: z.string()
});

const ProjectsConnectionSchema = z.object({
    nodes: z.array(ProjectNodeSchema).optional(),
    pageInfo: PageInfoSchema.optional()
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        projects: ProjectsConnectionSchema
    })
});

const action = createAction({
    description: 'List Linear projects with filtering and pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-projects',
        group: 'Projects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build GraphQL variables
        const variables: Record<string, unknown> = {};

        if (input['first'] !== undefined) {
            variables['first'] = input['first'];
        }

        if (input['after'] !== undefined) {
            variables['after'] = input['after'];
        }

        if (input['filter'] !== undefined) {
            variables['filter'] = input['filter'];
        }

        if (input['orderBy'] !== undefined) {
            variables['orderBy'] = input['orderBy'];
        }

        // https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    query Projects($first: Int, $after: String, $filter: ProjectFilter, $orderBy: PaginationOrderBy) {
                        projects(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
                            nodes {
                                id
                                name
                                slugId
                                description
                                state
                                progress
                                startedAt
                                targetDate
                                createdAt
                                updatedAt
                                url
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

        const parseResult = GraphQLResponseSchema.safeParse(response.data);

        if (!parseResult.success) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Unexpected response format from Linear API'
            });
        }

        const projectsData = parseResult.data.data.projects;
        const nodes = projectsData.nodes || [];
        const pageInfo = projectsData.pageInfo || {};

        return {
            projects: nodes.map((node) => ({
                id: node.id,
                name: node.name,
                slugId: node.slugId,
                description: node.description !== undefined ? node.description : null,
                state: node.state !== undefined ? node.state : null,
                progress: node.progress !== undefined ? node.progress : null,
                startedAt: node.startedAt !== undefined ? node.startedAt : null,
                targetDate: node.targetDate !== undefined ? node.targetDate : null,
                createdAt: node.createdAt,
                updatedAt: node.updatedAt,
                url: node.url
            })),
            next_cursor: pageInfo.endCursor || null,
            has_more: Boolean(pageInfo.hasNextPage)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
