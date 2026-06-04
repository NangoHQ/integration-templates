import { z } from 'zod';
import { createAction } from 'nango';

const MetaobjectFieldInputSchema = z.object({
    key: z.string().describe('The field key. Example: "hex"'),
    value: z.string().describe('The field value. Example: "#4B0082"')
});

const InputSchema = z.object({
    type: z.string().describe('The metaobject definition type. Example: "color"'),
    handle: z.string().describe('The unique handle within the metaobject type. Example: "indigo-swatch"'),
    fields: z.array(MetaobjectFieldInputSchema).describe('Field values to set on the metaobject.')
});

const ProviderMetaobjectFieldSchema = z.object({
    key: z.string(),
    value: z.string().nullable()
});

const ProviderMetaobjectSchema = z.object({
    id: z.string(),
    handle: z.string(),
    type: z.string(),
    fields: z.array(ProviderMetaobjectFieldSchema),
    createdAt: z.string(),
    updatedAt: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    handle: z.string(),
    type: z.string(),
    fields: z.array(
        z.object({
            key: z.string(),
            value: z.string().optional()
        })
    ),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Create or update a Shopify metaobject by type and handle.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/upsert-metaobject',
        group: 'Metaobjects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_metaobjects'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation UpsertMetaobject($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
                metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
                    metaobject {
                        id
                        handle
                        type
                        fields {
                            key
                            value
                        }
                        createdAt
                        updatedAt
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
            handle: {
                type: input.type,
                handle: input.handle
            },
            metaobject: {
                fields: input.fields
            }
        };

        // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/metaobjectUpsert
        const response = await nango.post({
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query,
                variables
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid or empty response from Shopify.'
            });
        }

        const payload = z
            .object({
                data: z
                    .object({
                        metaobjectUpsert: z
                            .object({
                                metaobject: ProviderMetaobjectSchema.nullable(),
                                userErrors: z.array(
                                    z.object({
                                        field: z.array(z.string()),
                                        message: z.string(),
                                        code: z.string()
                                    })
                                )
                            })
                            .optional()
                    })
                    .optional()
            })
            .parse(response.data);

        const result = payload.data?.metaobjectUpsert;

        if (!result) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing metaobjectUpsert in response.'
            });
        }

        if (result.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'shopify_error',
                message: result.userErrors.map((e) => `${e.code}: ${e.message}`).join('; '),
                errors: result.userErrors
            });
        }

        const metaobject = result.metaobject;
        if (!metaobject) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Metaobject not returned after upsert.'
            });
        }

        return {
            id: metaobject.id,
            handle: metaobject.handle,
            type: metaobject.type,
            fields: metaobject.fields.map((field) => ({
                key: field.key,
                ...(field.value != null && { value: field.value })
            })),
            createdAt: metaobject.createdAt,
            updatedAt: metaobject.updatedAt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
