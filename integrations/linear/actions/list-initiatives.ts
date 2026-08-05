import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const UserSchema = z.object({
    id: z.string(),
    name: z.string()
});

const InitiativeNodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    archivedAt: z.string().nullable().optional(),
    canceledAt: z.string().nullable().optional(),
    completedAt: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    slugId: z.string(),
    priority: z.number(),
    status: z.string(),
    targetDate: z.string().nullable().optional(),
    trashed: z.boolean().nullable().optional(),
    url: z.string(),
    owner: UserSchema.nullable().optional(),
    creator: UserSchema.nullable().optional()
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        initiatives: z.object({
            nodes: z.array(InitiativeNodeSchema),
            pageInfo: PageInfoSchema
        })
    })
});

const OutputItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    archivedAt: z.string().optional(),
    canceledAt: z.string().optional(),
    completedAt: z.string().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
    slugId: z.string(),
    priority: z.number(),
    status: z.string(),
    targetDate: z.string().optional(),
    trashed: z.boolean().optional(),
    url: z.string(),
    owner: UserSchema.optional(),
    creator: UserSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List Linear initiatives with pagination.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query Initiatives($after: String) {
                initiatives(first: 50, after: $after) {
                    nodes {
                        id
                        name
                        description
                        createdAt
                        updatedAt
                        archivedAt
                        canceledAt
                        completedAt
                        color
                        icon
                        slugId
                        priority
                        status
                        targetDate
                        trashed
                        url
                        owner {
                            id
                            name
                        }
                        creator {
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

        // https://linear.app/developers/graphql
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query,
                variables: {
                    ...(input.cursor !== undefined && { after: input.cursor })
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider response did not match expected schema.'
            });
        }

        const { initiatives } = parsed.data.data;
        const items = initiatives.nodes.map((node) => ({
            id: node.id,
            name: node.name,
            ...(node.description != null && { description: node.description }),
            createdAt: node.createdAt,
            updatedAt: node.updatedAt,
            ...(node.archivedAt != null && { archivedAt: node.archivedAt }),
            ...(node.canceledAt != null && { canceledAt: node.canceledAt }),
            ...(node.completedAt != null && { completedAt: node.completedAt }),
            ...(node.color != null && { color: node.color }),
            ...(node.icon != null && { icon: node.icon }),
            slugId: node.slugId,
            priority: node.priority,
            status: node.status,
            ...(node.targetDate != null && { targetDate: node.targetDate }),
            ...(node.trashed != null && { trashed: node.trashed }),
            url: node.url,
            ...(node.owner != null && { owner: node.owner }),
            ...(node.creator != null && { creator: node.creator })
        }));

        return {
            items,
            ...(initiatives.pageInfo.hasNextPage &&
                initiatives.pageInfo.endCursor != null && {
                    nextCursor: initiatives.pageInfo.endCursor
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
