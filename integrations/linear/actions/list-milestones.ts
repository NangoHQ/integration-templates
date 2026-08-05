import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    first: z.number().optional().describe('Number of items to fetch per page. Defaults to 50.')
});

const ProviderProjectMilestoneSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    targetDate: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    project: z
        .object({
            id: z.string()
        })
        .nullable()
        .optional()
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable().optional()
});

const ListOutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            name: z.string().optional(),
            description: z.string().optional(),
            targetDate: z.string().optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional(),
            projectId: z.string().optional()
        })
    ),
    nextCursor: z.string().optional()
});

const GraphQLErrorSchema = z
    .object({
        message: z.string()
    })
    .passthrough();

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            projectMilestones: z
                .object({
                    nodes: z.array(ProviderProjectMilestoneSchema),
                    pageInfo: PageInfoSchema
                })
                .optional()
        })
        .nullable()
        .optional(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const action = createAction({
    description: 'List Linear project milestones with pagination.',
    version: '1.0.1',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const query = `
            query ProjectMilestones($first: Int, $after: String) {
                projectMilestones(first: $first, after: $after) {
                    nodes {
                        id
                        name
                        description
                        targetDate
                        createdAt
                        updatedAt
                        project {
                            id
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `;

        // https://linear.app/developers
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query,
                variables: {
                    first: input.first ?? 50,
                    after: input.cursor
                }
            },
            retries: 3
        });

        const parsed = GraphQLResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: parsed.errors.map((e) => e.message).join(', ')
            });
        }

        const projectMilestones = parsed.data?.projectMilestones;

        if (!projectMilestones || !Array.isArray(projectMilestones.nodes)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Linear API: missing projectMilestones data or nodes array.'
            });
        }

        const items = projectMilestones.nodes.map((item) => {
            return {
                id: item.id,
                ...(item.name != null && { name: item.name }),
                ...(item.description != null && { description: item.description }),
                ...(item.targetDate != null && { targetDate: item.targetDate }),
                ...(item.createdAt != null && { createdAt: item.createdAt }),
                ...(item.updatedAt != null && { updatedAt: item.updatedAt }),
                ...(item.project != null && { projectId: item.project.id })
            };
        });

        return {
            items,
            ...(projectMilestones.pageInfo.hasNextPage && projectMilestones.pageInfo.endCursor != null
                ? { nextCursor: projectMilestones.pageInfo.endCursor }
                : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
