import { z } from 'zod';
import { createAction } from 'nango';

const FieldValidationInputSchema = z.object({
    name: z.string(),
    value: z.string()
});

const FieldDefinitionInputSchema = z.object({
    name: z.string(),
    key: z.string(),
    type: z.string(),
    validations: z.array(FieldValidationInputSchema).optional()
});

const InputSchema = z.object({
    type: z.string().describe('Unique type identifier for the metaobject. Example: "color-swatch"'),
    displayName: z.string().describe('Human-readable display name for the metaobject definition. Example: "Color swatch"'),
    fieldDefinitions: z.array(FieldDefinitionInputSchema).describe('Field definitions for the metaobject.')
});

const ProviderMetaobjectDefinitionSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    fieldDefinitions: z
        .array(
            z.object({
                name: z.string(),
                key: z.string()
            })
        )
        .optional()
});

const ProviderUserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string(),
    code: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        metaobjectDefinitionCreate: z.object({
            metaobjectDefinition: ProviderMetaobjectDefinitionSchema.nullable().optional(),
            userErrors: z.array(ProviderUserErrorSchema)
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    fieldDefinitions: z
        .array(
            z.object({
                name: z.string(),
                key: z.string()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Create a Shopify metaobject definition.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_metaobject_definitions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation CreateMetaobjectDefinition($definition: MetaobjectDefinitionCreateInput!) {
                metaobjectDefinitionCreate(definition: $definition) {
                    metaobjectDefinition {
                        id
                        name
                        type
                        fieldDefinitions {
                            name
                            key
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

        const variables = {
            definition: {
                type: input.type,
                name: input.displayName,
                fieldDefinitions: input.fieldDefinitions
            }
        };

        // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/metaobjectDefinitionCreate
        const response = await nango.post({
            endpoint: '/admin/api/2026-04/graphql.json',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                query,
                variables
            },
            retries: 1
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const result = parsed.data.metaobjectDefinitionCreate;

        if (result.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'shopify_error',
                message: result.userErrors.map((e) => e.message).join('; '),
                errors: result.userErrors
            });
        }

        const definition = result.metaobjectDefinition;
        if (!definition) {
            throw new nango.ActionError({
                type: 'not_created',
                message: 'Metaobject definition was not created.'
            });
        }

        return {
            id: definition.id,
            name: definition.name,
            type: definition.type,
            ...(definition.fieldDefinitions !== undefined && { fieldDefinitions: definition.fieldDefinitions })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
