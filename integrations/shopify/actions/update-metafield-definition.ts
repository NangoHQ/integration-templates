import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the metafield definition to update. Example: "gid://shopify/MetafieldDefinition/1234567890"'),
    name: z.string().optional().describe('The human-readable name for the metafield definition.'),
    description: z.string().nullable().optional().describe('The description for the metafield definition.'),
    access: z
        .object({
            admin: z.enum(['MERCHANT_READ', 'MERCHANT_READ_WRITE']).optional(),
            storefront: z.enum(['NONE', 'PUBLIC_READ']).optional(),
            customerAccount: z.enum(['NONE', 'READ', 'READ_WRITE']).optional()
        })
        .optional()
        .describe('The access settings for the metafield definition.'),
    pin: z.boolean().optional().describe('Whether to pin the metafield definition.'),
    validations: z
        .array(
            z.object({
                name: z.string(),
                value: z.string()
            })
        )
        .optional()
        .describe('A list of validation options for the metafields that belong to the definition.')
});

const AccessSchema = z.object({
    admin: z.string().optional(),
    storefront: z.string().optional(),
    customerAccount: z.string().optional()
});

const DefinitionTypeSchema = z.object({
    name: z.string()
});

const ProviderMetafieldDefinitionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    namespace: z.string(),
    key: z.string(),
    ownerType: z.string(),
    type: DefinitionTypeSchema,
    access: AccessSchema.optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string(),
    code: z.string().optional()
});

const LookupPayloadSchema = z.object({
    data: z.object({
        metafieldDefinition: z
            .object({
                id: z.string(),
                namespace: z.string(),
                key: z.string(),
                ownerType: z.string()
            })
            .nullable()
            .optional()
    })
});

const MutationPayloadSchema = z.object({
    data: z.object({
        metafieldDefinitionUpdate: z.object({
            updatedDefinition: ProviderMetafieldDefinitionSchema.nullable().optional(),
            userErrors: z.array(UserErrorSchema)
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    namespace: z.string().optional(),
    key: z.string().optional(),
    owner_type: z.string().optional(),
    type: z.string().optional(),
    access: AccessSchema.optional()
});

const action = createAction({
    description: 'Update a Shopify metafield definition.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-metafield-definition'
    },
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input) => {
        // https://shopify.dev/docs/api/admin-graphql/2026-04/queries/metafieldDefinition
        const lookupResponse = await nango.post({
            endpoint: 'admin/api/2026-04/graphql.json',
            data: {
                query: `
                    query GetMetafieldDefinition($id: ID!) {
                        metafieldDefinition(id: $id) {
                            id
                            namespace
                            key
                            ownerType
                        }
                    }
                `,
                variables: { id: input.id }
            },
            retries: 3
        });

        if (!lookupResponse.data) {
            throw new nango.ActionError({
                type: 'no_response',
                message: 'No response data from Shopify when looking up metafield definition.'
            });
        }

        if ('errors' in lookupResponse.data && Array.isArray(lookupResponse.data.errors) && lookupResponse.data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'Shopify GraphQL returned errors during lookup.',
                errors: lookupResponse.data.errors
            });
        }

        const lookupParsed = LookupPayloadSchema.parse(lookupResponse.data);
        const existingDefinition = lookupParsed.data.metafieldDefinition;

        if (!existingDefinition) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Metafield definition with ID ${input.id} not found.`
            });
        }

        const variables = {
            definition: {
                namespace: existingDefinition.namespace,
                key: existingDefinition.key,
                ownerType: existingDefinition.ownerType,
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.access !== undefined && { access: input.access }),
                ...(input.pin !== undefined && { pin: input.pin }),
                ...(input.validations !== undefined && { validations: input.validations })
            }
        };

        // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/metafieldDefinitionUpdate
        const response = await nango.post({
            endpoint: 'admin/api/2026-04/graphql.json',
            data: {
                query: `
                    mutation UpdateMetafieldDefinition($definition: MetafieldDefinitionUpdateInput!) {
                        metafieldDefinitionUpdate(definition: $definition) {
                            updatedDefinition {
                                id
                                name
                                description
                                namespace
                                key
                                ownerType
                                type {
                                    name
                                }
                                access {
                                    admin
                                    storefront
                                    customerAccount
                                }
                            }
                            userErrors {
                                field
                                message
                                code
                            }
                        }
                    }
                `,
                variables
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'no_response',
                message: 'No response data from Shopify.'
            });
        }

        if ('errors' in response.data && Array.isArray(response.data.errors) && response.data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'Shopify GraphQL returned errors.',
                errors: response.data.errors
            });
        }

        const parsed = MutationPayloadSchema.parse(response.data);
        const updateResult = parsed.data.metafieldDefinitionUpdate;

        if (updateResult.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'user_error',
                message: updateResult.userErrors.map((err) => err.message).join('; '),
                errors: updateResult.userErrors
            });
        }

        const definition = updateResult.updatedDefinition;

        if (!definition) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Updated metafield definition not found in response.'
            });
        }

        return {
            id: definition.id,
            ...(definition.name != null && { name: definition.name }),
            ...(definition.description != null && { description: definition.description }),
            ...(definition.namespace != null && { namespace: definition.namespace }),
            ...(definition.key != null && { key: definition.key }),
            ...(definition.ownerType != null && { owner_type: definition.ownerType }),
            ...(definition.type != null && { type: definition.type.name }),
            ...(definition.access != null && { access: definition.access })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
