import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    type: z.string().describe('The type of the metaobjects to query. Example: "app:author"'),
    first: z.number().int().min(1).max(250).optional().describe('The number of metaobjects to return. Max 250. Example: 10'),
    after: z.string().optional().describe('The cursor to fetch the next page. Example: "eyJsYXN0X2lkIjo5NzE2NjI1MzB9"'),
    sortKey: z.enum(['ID', 'TYPE', 'UPDATED_AT', 'DISPLAY_NAME']).optional().describe('The key to sort by. Valid values: ID, TYPE, UPDATED_AT, DISPLAY_NAME.'),
    reverse: z.boolean().optional().describe('Reverse the order of the results.')
});

const MetaobjectFieldSchema = z.object({
    key: z.string(),
    value: z.string().nullable().optional(),
    jsonValue: z.unknown().optional(),
    type: z.string()
});

const MetaobjectSchema = z.object({
    id: z.string(),
    handle: z.string(),
    type: z.string(),
    displayName: z.string(),
    updatedAt: z.string(),
    createdAt: z.string(),
    fields: z.array(MetaobjectFieldSchema)
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable().optional()
});

const GraphQLDataSchema = z.object({
    metaobjects: z
        .object({
            nodes: z.array(MetaobjectSchema),
            pageInfo: PageInfoSchema
        })
        .nullable()
        .optional()
});

const GraphQLResponseSchema = z.object({
    data: GraphQLDataSchema.nullable().optional(),
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    items: z.array(MetaobjectSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List Shopify metaobjects by type with pagination.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_metaobjects'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const variables: Record<string, unknown> = {
            type: input.type
        };

        if (input.first !== undefined) {
            variables['first'] = input.first;
        }
        if (input.after !== undefined) {
            variables['after'] = input.after;
        }
        if (input.sortKey !== undefined) {
            variables['sortKey'] = input.sortKey;
        }
        if (input.reverse !== undefined) {
            variables['reverse'] = input.reverse;
        }

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/queries/metaobjects
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `query Metaobjects($type: String!, $first: Int, $after: String, $sortKey: MetaobjectSortKeys, $reverse: Boolean) {
                    metaobjects(type: $type, first: $first, after: $after, sortKey: $sortKey, reverse: $reverse) {
                        nodes {
                            id
                            handle
                            type
                            displayName
                            updatedAt
                            createdAt
                            fields {
                                key
                                value
                                jsonValue
                                type
                            }
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }`,
                variables
            },
            retries: 3
        });

        const parsedResponse = GraphQLResponseSchema.parse(response.data);

        if (parsedResponse.errors && parsedResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'Shopify GraphQL API returned errors',
                errors: parsedResponse.errors
            });
        }

        const metaobjects = parsedResponse.data?.metaobjects;
        if (!metaobjects) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No metaobjects found or invalid query'
            });
        }

        return {
            items: metaobjects.nodes,
            ...(metaobjects.pageInfo.endCursor != null && metaobjects.pageInfo.hasNextPage && { nextCursor: metaobjects.pageInfo.endCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
