import { z } from 'zod';
import { createAction } from 'nango';

const CommentFilterSchema = z
    .object({
        id: z
            .object({
                eq: z.string().optional(),
                in: z.array(z.string()).optional()
            })
            .optional(),
        issue: z
            .object({
                id: z
                    .object({
                        eq: z.string().optional(),
                        in: z.array(z.string()).optional()
                    })
                    .optional()
            })
            .optional(),
        parent: z
            .object({
                id: z
                    .object({
                        eq: z.string().optional(),
                        in: z.array(z.string()).optional()
                    })
                    .optional()
            })
            .optional(),
        user: z
            .object({
                id: z
                    .object({
                        eq: z.string().optional(),
                        in: z.array(z.string()).optional()
                    })
                    .optional()
            })
            .optional(),
        createdAt: z
            .object({
                eq: z.string().optional(),
                gt: z.string().optional(),
                gte: z.string().optional(),
                lt: z.string().optional(),
                lte: z.string().optional()
            })
            .optional(),
        updatedAt: z
            .object({
                eq: z.string().optional(),
                gt: z.string().optional(),
                gte: z.string().optional(),
                lt: z.string().optional(),
                lte: z.string().optional()
            })
            .optional(),
        body: z
            .object({
                eq: z.string().optional(),
                contains: z.string().optional()
            })
            .optional()
    })
    .optional()
    .describe('Filter criteria for comments. Supports filtering by id, issue, parent, user, createdAt, updatedAt, and body.');

const InputSchema = z.object({
    first: z.number().min(1).max(100).optional().describe('Number of comments to return. Maximum: 100. Default: 50.'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    filter: CommentFilterSchema,
    orderBy: z.enum(['createdAt', 'updatedAt']).optional().describe('Field to order by. Options: createdAt (default), updatedAt.'),
    includeArchived: z.boolean().optional().describe('Include archived comments in results. Default: false.')
});

const CommentSchema = z.object({
    id: z.string(),
    body: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    url: z.string(),
    archivedAt: z.union([z.string(), z.null()]),
    editedAt: z.union([z.string(), z.null()]),
    user: z
        .union([
            z.object({
                id: z.string(),
                name: z.string(),
                email: z.string()
            }),
            z.null()
        ])
        .optional(),
    issueId: z.union([z.string(), z.null()]),
    parentId: z.union([z.string(), z.null()]),
    documentContentId: z.union([z.string(), z.null()]),
    initiativeId: z.union([z.string(), z.null()]),
    initiativeUpdateId: z.union([z.string(), z.null()]),
    projectId: z.union([z.string(), z.null()]),
    projectUpdateId: z.union([z.string(), z.null()]),
    resolvingCommentId: z.union([z.string(), z.null()]),
    resolvedAt: z.union([z.string(), z.null()]),
    quotedText: z.union([z.string(), z.null()]),
    reactionData: z.any().optional()
});

const PageInfoSchema = z.object({
    startCursor: z.union([z.string(), z.null()]),
    endCursor: z.union([z.string(), z.null()]),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean()
});

const OutputSchema = z.object({
    items: z.array(CommentSchema),
    nextCursor: z.union([z.string(), z.null()]),
    pageInfo: PageInfoSchema
});

const action = createAction({
    description: 'List Linear comments with filtering and pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-comments',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query Comments(
                $first: Int,
                $after: String,
                $filter: CommentFilter,
                $orderBy: PaginationOrderBy,
                $includeArchived: Boolean
            ) {
                comments(
                    first: $first,
                    after: $after,
                    filter: $filter,
                    orderBy: $orderBy,
                    includeArchived: $includeArchived
                ) {
                    nodes {
                        id
                        body
                        createdAt
                        updatedAt
                        url
                        archivedAt
                        editedAt
                        user {
                            id
                            name
                            email
                        }
                        issueId
                        parentId
                        documentContentId
                        initiativeId
                        initiativeUpdateId
                        projectId
                        projectUpdateId
                        resolvingCommentId
                        resolvedAt
                        quotedText
                        reactionData
                    }
                    pageInfo {
                        startCursor
                        endCursor
                        hasNextPage
                        hasPreviousPage
                    }
                }
            }
        `;

        // https://developers.linear.app/docs/graphql/working-with-the-graphql-api/pagination
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query,
                variables: {
                    first: input.first,
                    after: input.after,
                    filter: input.filter,
                    orderBy: input.orderBy,
                    includeArchived: input.includeArchived
                }
            },
            retries: 3
        });

        if (response.data?.errors?.length > 0) {
            const error = response.data.errors[0];
            throw new nango.ActionError({
                type: 'graphql_error',
                message: error.message || 'Linear GraphQL API error',
                details: error
            });
        }

        const connection = response.data?.data?.comments;

        if (!connection) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Linear API'
            });
        }

        const nodes = connection.nodes || [];
        const pageInfo = connection.pageInfo || {
            startCursor: null,
            endCursor: null,
            hasNextPage: false,
            hasPreviousPage: false
        };

        const NodeSchema = z.object({
            id: z.string(),
            body: z.string(),
            createdAt: z.string(),
            updatedAt: z.string(),
            url: z.string(),
            archivedAt: z.union([z.string(), z.null()]).optional(),
            editedAt: z.union([z.string(), z.null()]).optional(),
            user: z
                .union([
                    z.object({
                        id: z.string(),
                        name: z.string(),
                        email: z.string()
                    }),
                    z.null()
                ])
                .optional(),
            issueId: z.union([z.string(), z.null()]).optional(),
            parentId: z.union([z.string(), z.null()]).optional(),
            documentContentId: z.union([z.string(), z.null()]).optional(),
            initiativeId: z.union([z.string(), z.null()]).optional(),
            initiativeUpdateId: z.union([z.string(), z.null()]).optional(),
            projectId: z.union([z.string(), z.null()]).optional(),
            projectUpdateId: z.union([z.string(), z.null()]).optional(),
            resolvingCommentId: z.union([z.string(), z.null()]).optional(),
            resolvedAt: z.union([z.string(), z.null()]).optional(),
            quotedText: z.union([z.string(), z.null()]).optional(),
            reactionData: z.any().optional()
        });

        const items = nodes.map((node: unknown) => {
            const parsed = NodeSchema.safeParse(node);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'parse_error',
                    message: 'Failed to parse comment node',
                    details: parsed.error
                });
            }

            const n = parsed.data;

            return {
                id: n.id,
                body: n.body,
                createdAt: n.createdAt,
                updatedAt: n.updatedAt,
                url: n.url,
                archivedAt: n.archivedAt ?? null,
                editedAt: n.editedAt ?? null,
                user: n.user ?? null,
                issueId: n.issueId ?? null,
                parentId: n.parentId ?? null,
                documentContentId: n.documentContentId ?? null,
                initiativeId: n.initiativeId ?? null,
                initiativeUpdateId: n.initiativeUpdateId ?? null,
                projectId: n.projectId ?? null,
                projectUpdateId: n.projectUpdateId ?? null,
                resolvingCommentId: n.resolvingCommentId ?? null,
                resolvedAt: n.resolvedAt ?? null,
                quotedText: n.quotedText ?? null,
                reactionData: n.reactionData ?? {}
            };
        });

        return {
            items,
            nextCursor: pageInfo.endCursor ?? null,
            pageInfo: {
                startCursor: pageInfo.startCursor ?? null,
                endCursor: pageInfo.endCursor ?? null,
                hasNextPage: pageInfo.hasNextPage ?? false,
                hasPreviousPage: pageInfo.hasPreviousPage ?? false
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
