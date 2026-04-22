import { z } from 'zod';
import { createAction } from 'nango';

// Input Schemas
const AttachmentFilterInput = z
    .object({
        id: z
            .object({
                eq: z.string().optional(),
                neq: z.string().optional(),
                in: z.array(z.string()).optional(),
                nin: z.array(z.string()).optional()
            })
            .optional(),
        createdAt: z
            .object({
                eq: z.string().optional(),
                neq: z.string().optional(),
                lt: z.string().optional(),
                lte: z.string().optional(),
                gt: z.string().optional(),
                gte: z.string().optional()
            })
            .optional(),
        updatedAt: z
            .object({
                eq: z.string().optional(),
                neq: z.string().optional(),
                lt: z.string().optional(),
                lte: z.string().optional(),
                gt: z.string().optional(),
                gte: z.string().optional()
            })
            .optional(),
        url: z
            .object({
                eq: z.string().optional(),
                neq: z.string().optional(),
                in: z.array(z.string()).optional(),
                nin: z.array(z.string()).optional(),
                startsWith: z.string().optional(),
                notStartsWith: z.string().optional(),
                endsWith: z.string().optional(),
                notEndsWith: z.string().optional(),
                contains: z.string().optional(),
                notContains: z.string().optional(),
                containsIgnoreCase: z.string().optional(),
                notContainsIgnoreCase: z.string().optional()
            })
            .optional(),
        title: z
            .object({
                eq: z.string().optional(),
                neq: z.string().optional(),
                in: z.array(z.string()).optional(),
                nin: z.array(z.string()).optional(),
                startsWith: z.string().optional(),
                notStartsWith: z.string().optional(),
                endsWith: z.string().optional(),
                notEndsWith: z.string().optional(),
                contains: z.string().optional(),
                notContains: z.string().optional(),
                containsIgnoreCase: z.string().optional(),
                notContainsIgnoreCase: z.string().optional()
            })
            .optional(),
        source: z
            .object({
                eq: z.string().optional(),
                neq: z.string().optional(),
                in: z.array(z.string()).optional(),
                nin: z.array(z.string()).optional(),
                startsWith: z.string().optional(),
                notStartsWith: z.string().optional(),
                endsWith: z.string().optional(),
                notEndsWith: z.string().optional(),
                contains: z.string().optional(),
                notContains: z.string().optional(),
                containsIgnoreCase: z.string().optional(),
                notContainsIgnoreCase: z.string().optional()
            })
            .optional()
    })
    .optional()
    .describe('Filter criteria for attachments query');

const InputSchema = z.object({
    first: z.number().int().min(1).max(100).optional().describe('Number of items to return (1-100). Default: 50.'),
    after: z.string().optional().describe('Pagination cursor from the previous pageInfo.endCursor. Omit for the first page.'),
    filter: AttachmentFilterInput,
    orderBy: z
        .union([z.literal('createdAt'), z.literal('updatedAt')])
        .optional()
        .describe('Order results by createdAt or updatedAt. Default: createdAt.')
});

// Output Schemas
const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.union([z.string(), z.null()])
});

const IssueSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string()
});

const SourceSchema = z.object({
    name: z.string(),
    type: z.string(),
    clientId: z.string()
});

const AttachmentSchema = z.object({
    id: z.string(),
    url: z.string(),
    title: z.union([z.string(), z.null()]),
    source: SourceSchema,
    sourceType: z.union([z.string(), z.null()]),
    metadata: z.any(),
    createdAt: z.string(),
    updatedAt: z.string(),
    issue: IssueSchema.optional()
});

const OutputSchema = z.object({
    attachments: z.array(AttachmentSchema),
    pageInfo: PageInfoSchema
});

const action = createAction({
    description: 'List Linear attachments with filtering and pagination',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-attachments',
        group: 'Attachments'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build the query variables from input using Object.entries to avoid index signature issues
        const variables: Record<string, unknown> = {};
        const inputEntries = Object.entries(input);

        for (const entry of inputEntries) {
            const key = entry[0];
            const value = entry[1];
            if (value !== undefined) {
                variables[key] = value;
            }
        }

        // https://linear.app/developers/graphql
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    query Attachments($first: Int, $after: String, $filter: AttachmentFilter, $orderBy: PaginationOrderBy) {
                        attachments(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
                            nodes {
                                id
                                url
                                title
                                source
                                sourceType
                                metadata
                                createdAt
                                updatedAt
                                issue {
                                    id
                                    identifier
                                    title
                                }
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

        if (!response.data || !response.data.data || !response.data.data.attachments) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Linear API'
            });
        }

        const attachmentsData = response.data.data.attachments;
        const nodes = attachmentsData.nodes || [];
        const pageInfo = attachmentsData.pageInfo || { hasNextPage: false, endCursor: null };

        return {
            attachments: nodes.map(
                (node: {
                    id: string;
                    url: string;
                    title: string | null;
                    source: { name: string; type: string; clientId: string };
                    sourceType: string | null;
                    metadata: Record<string, unknown> | null;
                    createdAt: string;
                    updatedAt: string;
                    issue?: { id: string; identifier: string; title: string };
                }) => ({
                    id: node.id,
                    url: node.url,
                    title: node.title ?? null,
                    source: node.source,
                    sourceType: node.sourceType ?? null,
                    metadata: node.metadata ?? null,
                    createdAt: node.createdAt,
                    updatedAt: node.updatedAt,
                    issue: node.issue
                })
            ),
            pageInfo: {
                hasNextPage: pageInfo.hasNextPage,
                endCursor: pageInfo.endCursor ?? null
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
