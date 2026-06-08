import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The GraphQL ID of the metaobject. Example: "gid://shopify/Metaobject/123"')
});

const ProviderMetaobjectCapabilitySchema = z.object({
    publishable: z
        .object({
            status: z.string()
        })
        .nullable()
        .optional()
});

const ProviderMetaobjectFieldSchema = z.object({
    key: z.string(),
    type: z.string(),
    value: z.string().nullable().optional()
});

const ProviderMetaobjectSchema = z.object({
    id: z.string(),
    type: z.string(),
    handle: z.string(),
    capabilities: ProviderMetaobjectCapabilitySchema,
    fields: z.array(ProviderMetaobjectFieldSchema)
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        metaobject: ProviderMetaobjectSchema.nullable().optional()
    }),
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    handle: z.string(),
    capabilities: z.object({
        publishable: z
            .object({
                status: z.string()
            })
            .optional()
    }),
    fields: z.array(
        z.object({
            key: z.string(),
            type: z.string(),
            value: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'Retrieve a Shopify metaobject by GraphQL ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-metaobject',
        group: 'Metaobjects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_metaobjects'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2024-10/queries/metaobject
            endpoint: '/admin/api/2024-10/graphql.json',
            data: {
                query: `
                    query GetMetaobject($id: ID!) {
                        metaobject(id: $id) {
                            id
                            type
                            handle
                            capabilities {
                                publishable {
                                    status
                                }
                            }
                            fields {
                                key
                                type
                                value
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        const body = GraphQLResponseSchema.parse(response.data);

        if (body.errors && body.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Shopify GraphQL API returned errors',
                errors: body.errors
            });
        }

        if (!body.data.metaobject) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Metaobject not found',
                id: input.id
            });
        }

        const providerMetaobject = body.data.metaobject;

        return {
            id: providerMetaobject.id,
            type: providerMetaobject.type,
            handle: providerMetaobject.handle,
            capabilities: {
                ...(providerMetaobject.capabilities.publishable != null && {
                    publishable: {
                        status: providerMetaobject.capabilities.publishable.status
                    }
                })
            },
            fields: providerMetaobject.fields.map((field) => ({
                key: field.key,
                type: field.type,
                ...(field.value != null && { value: field.value })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
