import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner_type: z.string().describe('The resource type that the metafield definition is attached to. Example: "PRODUCT"'),
    first: z.number().optional().describe('The first n elements from the paginated list.'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    namespace: z.string().optional().describe('Filter metafield definitions by namespace.'),
    pinned_status: z.string().optional().describe('Filter by pinned status. Values: ANY, PINNED, UNPINNED.')
});

const ProviderMetafieldDefinitionTypeSchema = z.object({
    name: z.string()
});

const ProviderMetafieldDefinitionValidationSchema = z.object({
    name: z.string(),
    value: z.string().optional()
});

const ProviderMetafieldAccessSchema = z.object({
    admin: z.string().optional(),
    customerAccount: z.string().optional(),
    storefront: z.string().optional()
});

const ProviderMetafieldDefinitionSchema = z.object({
    id: z.string(),
    name: z.string(),
    namespace: z.string(),
    key: z.string(),
    description: z.string().optional(),
    ownerType: z.string(),
    type: ProviderMetafieldDefinitionTypeSchema,
    pinnedPosition: z.number().optional(),
    useAsCollectionCondition: z.boolean().optional(),
    validationStatus: z.string().optional(),
    validations: z.array(ProviderMetafieldDefinitionValidationSchema).optional(),
    metafieldsCount: z.number().optional(),
    access: ProviderMetafieldAccessSchema.optional()
});

const ProviderPageInfoSchema = z.object({
    hasNextPage: z.boolean().optional(),
    endCursor: z.string().nullable().optional()
});

const ProviderMetafieldDefinitionsConnectionSchema = z.object({
    nodes: z.array(ProviderMetafieldDefinitionSchema),
    pageInfo: ProviderPageInfoSchema.optional()
});

const ProviderGraphQLDataSchema = z.object({
    metafieldDefinitions: ProviderMetafieldDefinitionsConnectionSchema
});

const ProviderGraphQLResponseSchema = z.object({
    data: ProviderGraphQLDataSchema.optional(),
    errors: z.array(z.unknown()).optional()
});

const MetafieldDefinitionTypeSchema = z.object({
    name: z.string()
});

const MetafieldDefinitionValidationSchema = z.object({
    name: z.string(),
    value: z.string().optional()
});

const MetafieldAccessSchema = z.object({
    admin: z.string().optional(),
    customer_account: z.string().optional(),
    storefront: z.string().optional()
});

const MetafieldDefinitionSchema = z.object({
    id: z.string(),
    name: z.string(),
    namespace: z.string(),
    key: z.string(),
    description: z.string().optional(),
    owner_type: z.string(),
    type: MetafieldDefinitionTypeSchema,
    pinned_position: z.number().optional(),
    use_as_collection_condition: z.boolean().optional(),
    validation_status: z.string().optional(),
    validations: z.array(MetafieldDefinitionValidationSchema).optional(),
    metafields_count: z.number().optional(),
    access: MetafieldAccessSchema.optional()
});

const OutputSchema = z.object({
    definitions: z.array(MetafieldDefinitionSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List Shopify metafield definitions for a resource type.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-metafield-definitions',
        group: 'Metafields'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_metafields'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query MetafieldDefinitions($ownerType: MetafieldOwnerType!, $first: Int, $after: String, $namespace: String, $pinnedStatus: MetafieldDefinitionPinnedStatus) {
                metafieldDefinitions(ownerType: $ownerType, first: $first, after: $after, namespace: $namespace, pinnedStatus: $pinnedStatus) {
                    nodes {
                        id
                        name
                        namespace
                        key
                        description
                        ownerType
                        type {
                            name
                        }
                        pinnedPosition
                        useAsCollectionCondition
                        validationStatus
                        validations {
                            name
                            value
                        }
                        metafieldsCount
                        access {
                            admin
                            customerAccount
                            storefront
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
            ownerType: input.owner_type
        };
        if (input.first !== undefined) {
            variables['first'] = input.first;
        }
        if (input.after !== undefined) {
            variables['after'] = input.after;
        }
        if (input.namespace !== undefined) {
            variables['namespace'] = input.namespace;
        }
        if (input.pinned_status !== undefined) {
            variables['pinnedStatus'] = input.pinned_status;
        }

        // https://shopify.dev/docs/api/admin-graphql/latest/queries/metafieldDefinitions
        const response = await nango.post({
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: query,
                variables: variables
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Shopify API'
            });
        }

        const parsed = ProviderGraphQLResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse Shopify API response',
                details: parsed.error.format()
            });
        }

        const data = parsed.data;
        if (data.errors && data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL errors from Shopify API',
                errors: data.errors
            });
        }

        if (!data.data) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing data in Shopify API response'
            });
        }

        const connection = data.data.metafieldDefinitions;
        const nodes = connection.nodes;
        const pageInfo = connection.pageInfo;

        const definitions = nodes.map((node) => {
            return {
                id: node.id,
                name: node.name,
                namespace: node.namespace,
                key: node.key,
                ...(node.description !== undefined ? { description: node.description } : {}),
                owner_type: node.ownerType,
                type: {
                    name: node.type.name
                },
                ...(node.pinnedPosition !== undefined ? { pinned_position: node.pinnedPosition } : {}),
                ...(node.useAsCollectionCondition !== undefined ? { use_as_collection_condition: node.useAsCollectionCondition } : {}),
                ...(node.validationStatus !== undefined ? { validation_status: node.validationStatus } : {}),
                ...(node.validations !== undefined
                    ? {
                          validations: node.validations.map((v) => ({
                              name: v.name,
                              ...(v.value !== undefined ? { value: v.value } : {})
                          }))
                      }
                    : {}),
                ...(node.metafieldsCount !== undefined ? { metafields_count: node.metafieldsCount } : {}),
                ...(node.access !== undefined
                    ? {
                          access: {
                              ...(node.access.admin !== undefined ? { admin: node.access.admin } : {}),
                              ...(node.access.customerAccount !== undefined ? { customer_account: node.access.customerAccount } : {}),
                              ...(node.access.storefront !== undefined ? { storefront: node.access.storefront } : {})
                          }
                      }
                    : {})
            };
        });

        return {
            definitions: definitions,
            ...(pageInfo !== undefined && pageInfo.endCursor !== undefined && pageInfo.endCursor !== null && pageInfo.hasNextPage === true
                ? { next_cursor: pageInfo.endCursor }
                : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
