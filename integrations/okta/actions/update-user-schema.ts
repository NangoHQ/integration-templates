import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    schemaId: z.string().describe('User schema ID. Example: "osc14u78ldxtbv6BP698"'),
    attributeName: z.string().describe('Name of the custom attribute to add or update. Example: "nangoTestAttribute"'),
    title: z.string().describe('Display title of the attribute.'),
    type: z.string().describe('Data type of the attribute. Example: "string"'),
    description: z.string().optional().describe('Description of the attribute.'),
    mutability: z.string().optional().describe('Mutability setting. Example: "READ_WRITE"'),
    scope: z.string().optional().describe('Scope of the attribute. Example: "SELF"')
});

const ProviderCustomPropertySchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    mutability: z.string().optional(),
    scope: z.string().optional()
});

const ProviderSchemaResponseSchema = z.object({
    definitions: z
        .object({
            custom: z
                .object({
                    properties: z.record(z.string(), z.unknown())
                })
                .optional()
        })
        .optional()
});

const OutputSchema = z.object({
    schemaId: z.string(),
    attributeName: z.string(),
    attribute: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        type: z.string().optional(),
        mutability: z.string().optional(),
        scope: z.string().optional()
    })
});

const action = createAction({
    description: 'Add or update a custom attribute on a user schema.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.schemas.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.okta.com/docs/reference/api/schemas/
            endpoint: `/api/v1/meta/schemas/user/${encodeURIComponent(input.schemaId)}`,
            data: {
                definitions: {
                    custom: {
                        id: '#custom',
                        type: 'object',
                        properties: {
                            [input.attributeName]: {
                                title: input.title,
                                type: input.type,
                                ...(input.description !== undefined && { description: input.description }),
                                ...(input.mutability !== undefined && { mutability: input.mutability }),
                                ...(input.scope !== undefined && { scope: input.scope })
                            }
                        }
                    }
                }
            },
            retries: 10
        });

        const schemaData = ProviderSchemaResponseSchema.parse(response.data);
        const customProperties = schemaData.definitions?.custom?.properties;
        const rawAttribute = customProperties ? customProperties[input.attributeName] : undefined;
        const attribute = ProviderCustomPropertySchema.parse(rawAttribute ?? {});

        return {
            schemaId: input.schemaId,
            attributeName: input.attributeName,
            attribute: {
                ...(attribute.title !== undefined && { title: attribute.title }),
                ...(attribute.description !== undefined && { description: attribute.description }),
                ...(attribute.type !== undefined && { type: attribute.type }),
                ...(attribute.mutability !== undefined && { mutability: attribute.mutability }),
                ...(attribute.scope !== undefined && { scope: attribute.scope })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
