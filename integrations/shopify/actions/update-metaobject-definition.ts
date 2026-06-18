import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const AccessInputSchema = z.object({
    admin: z.string().optional(),
    storefront: z.string().optional()
});

const FieldDefinitionValidationSchema = z.object({
    name: z.string(),
    value: z.string().optional()
});

const FieldDefinitionCreateInputSchema = z.object({
    key: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    required: z.boolean().optional(),
    validations: z.array(FieldDefinitionValidationSchema).optional()
});

const FieldDefinitionUpdateInputSchema = z.object({
    key: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    required: z.boolean().optional(),
    validations: z.array(FieldDefinitionValidationSchema).optional()
});

const FieldDefinitionDeleteInputSchema = z.object({
    key: z.string()
});

const FieldDefinitionOperationInputSchema = z.object({
    create: FieldDefinitionCreateInputSchema.optional(),
    update: FieldDefinitionUpdateInputSchema.optional(),
    delete: FieldDefinitionDeleteInputSchema.optional()
});

const InputSchema = z.object({
    id: z.string().describe('Metaobject definition ID. Example: gid://shopify/MetaobjectDefinition/123'),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    displayNameKey: z.string().optional(),
    access: AccessInputSchema.optional(),
    capabilities: z.record(z.string(), z.unknown()).optional(),
    resetFieldOrder: z.boolean().optional(),
    fieldDefinitions: z.array(FieldDefinitionOperationInputSchema).optional()
});

const MetaobjectUserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string(),
    code: z.string().optional()
});

const MetaobjectFieldTypeSchema = z.object({
    name: z.string().optional()
});

const MetaobjectFieldDefinitionSchema = z.object({
    name: z.string().optional(),
    key: z.string().optional(),
    type: MetaobjectFieldTypeSchema.optional(),
    validations: z.array(FieldDefinitionValidationSchema).optional()
});

const MetaobjectAccessSchema = z.object({
    admin: z.string().optional(),
    storefront: z.string().optional()
});

const MetaobjectDefinitionSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    description: z.string().nullable().optional(),
    displayNameKey: z.string().nullable().optional(),
    access: MetaobjectAccessSchema.nullable().optional(),
    fieldDefinitions: z.array(MetaobjectFieldDefinitionSchema).nullable().optional()
});

const OutputSchema = z.object({
    metaobjectDefinition: MetaobjectDefinitionSchema.optional(),
    userErrors: z.array(MetaobjectUserErrorSchema).optional()
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        metaobjectDefinitionUpdate: z.object({
            metaobjectDefinition: MetaobjectDefinitionSchema.nullable().optional(),
            userErrors: z.array(MetaobjectUserErrorSchema)
        })
    })
});

const action = createAction({
    description: 'Update a Shopify metaobject definition.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_metaobject_definitions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation UpdateMetaobjectDefinition($id: ID!, $definition: MetaobjectDefinitionUpdateInput!) {
                metaobjectDefinitionUpdate(id: $id, definition: $definition) {
                    metaobjectDefinition {
                        id
                        name
                        type
                        description
                        displayNameKey
                        access {
                            admin
                            storefront
                        }
                        fieldDefinitions {
                            name
                            key
                            type {
                                name
                            }
                            validations {
                                name
                                value
                            }
                        }
                    }
                    userErrors {
                        field
                        message
                        code
                    }
                }
            }
        `;

        const definition: Record<string, unknown> = {};
        if (input.name !== undefined) {
            definition['name'] = input.name;
        }
        if (input.description !== undefined) {
            definition['description'] = input.description;
        }
        if (input.displayNameKey !== undefined) {
            definition['displayNameKey'] = input.displayNameKey;
        }
        if (input.access !== undefined) {
            definition['access'] = input.access;
        }
        if (input.capabilities !== undefined) {
            definition['capabilities'] = input.capabilities;
        }
        if (input.resetFieldOrder !== undefined) {
            definition['resetFieldOrder'] = input.resetFieldOrder;
        }
        if (input.fieldDefinitions !== undefined) {
            definition['fieldDefinitions'] = input.fieldDefinitions;
        }

        const variables = {
            id: input.id,
            definition
        };

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2026-01/mutations/metaobjectDefinitionUpdate
            endpoint: '/admin/api/2026-01/graphql.json',
            data: {
                query,
                variables
            },
            retries: 3
        };

        const response = await nango.post(config);

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Shopify API'
            });
        }

        const parsed = GraphQLResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from Shopify API'
            });
        }

        const result = parsed.data.data.metaobjectDefinitionUpdate;

        if (result.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'shopify_error',
                message: 'Shopify returned user errors',
                userErrors: result.userErrors
            });
        }

        const def = result.metaobjectDefinition;
        const normalizedDefinition = def
            ? {
                  ...(def.id != null && { id: def.id }),
                  ...(def.name != null && { name: def.name }),
                  ...(def.type != null && { type: def.type }),
                  ...(def.description != null && { description: def.description }),
                  ...(def.displayNameKey != null && { displayNameKey: def.displayNameKey }),
                  ...(def.access != null && { access: def.access }),
                  ...(def.fieldDefinitions != null && { fieldDefinitions: def.fieldDefinitions })
              }
            : undefined;

        return {
            ...(normalizedDefinition ? { metaobjectDefinition: normalizedDefinition } : {}),
            userErrors: result.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
