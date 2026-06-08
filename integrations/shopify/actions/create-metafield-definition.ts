import { z } from 'zod';
import { createAction } from 'nango';

const MetafieldDefinitionValidationInputSchema = z.object({
    name: z.string(),
    value: z.string()
});

const MetafieldAccessInputSchema = z.object({
    admin: z.string().optional()
});

const InputSchema = z.object({
    name: z.string().describe('The human-readable name for the metafield definition.'),
    ownerType: z.string().describe('The resource type that the metafield definition is attached to. Example: "PRODUCT"'),
    namespace: z.string().describe('The container for a group of metafields. Example: "custom"'),
    key: z.string().describe('The unique identifier for the metafield definition within its namespace. Example: "material"'),
    type: z.string().describe('The type of data that the metafield will store. Example: "single_line_text_field"'),
    description: z.string().optional().describe('The description for the metafield definition.'),
    validations: z.array(MetafieldDefinitionValidationInputSchema).optional().describe('Validation options for the metafield definition.'),
    pin: z.boolean().optional().describe('Whether to pin the metafield definition.'),
    useAsCollectionCondition: z.boolean().optional().describe('Whether the metafield definition can be used as a collection condition.'),
    access: MetafieldAccessInputSchema.optional().describe('Access settings for the metafield definition.')
});

const MetafieldDefinitionTypeSchema = z.object({
    name: z.string()
});

const ProviderCreatedDefinitionSchema = z.object({
    id: z.string(),
    name: z.string(),
    namespace: z.string(),
    key: z.string(),
    ownerType: z.string(),
    type: MetafieldDefinitionTypeSchema,
    description: z.string().optional(),
    useAsCollectionCondition: z.boolean().optional()
});

const ProviderUserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string(),
    code: z.string().optional()
});

const ProviderDataSchema = z.object({
    metafieldDefinitionCreate: z.object({
        createdDefinition: ProviderCreatedDefinitionSchema.nullable().optional(),
        userErrors: z.array(ProviderUserErrorSchema)
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    namespace: z.string(),
    key: z.string(),
    ownerType: z.string(),
    type: z.string(),
    description: z.string().optional(),
    useAsCollectionCondition: z.boolean().optional()
});

const action = createAction({
    description: 'Create a Shopify metafield definition for a resource type.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-metafield-definition',
        group: 'Metafields'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_metaobject_definitions', 'write_metaobject_definitions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
                metafieldDefinitionCreate(definition: $definition) {
                    createdDefinition {
                        id
                        name
                        namespace
                        key
                        ownerType
                        type {
                            name
                        }
                        description
                        useAsCollectionCondition
                    }
                    userErrors {
                        field
                        message
                        code
                    }
                }
            }
        `;

        const variables = {
            definition: {
                name: input.name,
                ownerType: input.ownerType,
                namespace: input.namespace,
                key: input.key,
                type: input.type,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.validations !== undefined && { validations: input.validations }),
                ...(input.pin !== undefined && { pin: input.pin }),
                ...(input.useAsCollectionCondition !== undefined && { useAsCollectionCondition: input.useAsCollectionCondition }),
                ...(input.access !== undefined && { access: input.access })
            }
        };

        // https://shopify.dev/docs/api/admin-graphql/2025-04/mutations/metafieldDefinitionCreate
        const response = await nango.post({
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query: query,
                variables: variables
            },
            retries: 3
        });

        const responseData =
            typeof response.data === 'object' &&
            response.data !== null &&
            'data' in response.data &&
            typeof response.data.data === 'object' &&
            response.data.data !== null &&
            'metafieldDefinitionCreate' in response.data.data
                ? { metafieldDefinitionCreate: response.data.data.metafieldDefinitionCreate }
                : response.data;

        const parsedData = ProviderDataSchema.parse(responseData);
        const result = parsedData.metafieldDefinitionCreate;

        if (result.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'shopify_error',
                message: result.userErrors.map((err) => err.message).join('; '),
                errors: result.userErrors
            });
        }

        if (!result.createdDefinition) {
            throw new nango.ActionError({
                type: 'missing_definition',
                message: 'The metafield definition was not created.'
            });
        }

        const definition = result.createdDefinition;

        return {
            id: definition.id,
            name: definition.name,
            namespace: definition.namespace,
            key: definition.key,
            ownerType: definition.ownerType,
            type: definition.type.name,
            ...(definition.description !== undefined && { description: definition.description }),
            ...(definition.useAsCollectionCondition !== undefined && { useAsCollectionCondition: definition.useAsCollectionCondition })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
