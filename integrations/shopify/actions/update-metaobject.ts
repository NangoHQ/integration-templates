import { z } from 'zod';
import { createAction } from 'nango';

const MetaobjectFieldInputSchema = z.object({
    key: z.string(),
    value: z.string()
});

const InputSchema = z.object({
    id: z.string().describe('The globally unique ID of the metaobject to update. Example: "gid://shopify/Metaobject/123"'),
    handle: z.string().optional().describe('A new unique handle for the metaobject.'),
    fields: z.array(MetaobjectFieldInputSchema).optional().describe('Field values to update. Each entry maps a field key to its new value.')
});

const ProviderMetaobjectFieldSchema = z.object({
    key: z.string(),
    value: z.string().nullable()
});

const ProviderMetaobjectSchema = z.object({
    id: z.string(),
    handle: z.string(),
    type: z.string(),
    displayName: z.string(),
    updatedAt: z.string(),
    fields: z.array(ProviderMetaobjectFieldSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    handle: z.string(),
    type: z.string(),
    displayName: z.string(),
    updatedAt: z.string(),
    fields: z.array(
        z.object({
            key: z.string(),
            value: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'Update a Shopify metaobject entry.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-metaobject',
        group: 'Metaobjects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_metaobjects'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation UpdateMetaobject($id: ID!, $metaobject: MetaobjectUpdateInput!) {
                metaobjectUpdate(id: $id, metaobject: $metaobject) {
                    metaobject {
                        id
                        handle
                        type
                        displayName
                        updatedAt
                        fields {
                            key
                            value
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

        const variables: {
            id: string;
            metaobject: {
                handle?: string;
                fields?: { key: string; value: string }[];
            };
        } = {
            id: input.id,
            metaobject: {}
        };

        if (input.handle !== undefined) {
            variables.metaobject.handle = input.handle;
        }

        if (input.fields !== undefined) {
            variables.metaobject.fields = input.fields;
        }

        // https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/metaobjectUpdate
        const response = await nango.post({
            endpoint: '/admin/api/2025-10/graphql.json',
            data: {
                query: mutation,
                variables
            },
            retries: 1
        });

        const responseBody = z
            .object({
                data: z
                    .object({
                        metaobjectUpdate: z
                            .object({
                                metaobject: ProviderMetaobjectSchema.nullable(),
                                userErrors: z.array(
                                    z.object({
                                        field: z.array(z.string()),
                                        message: z.string(),
                                        code: z.string().nullable()
                                    })
                                )
                            })
                            .nullable()
                    })
                    .nullable()
            })
            .parse(response.data);

        const result = responseBody.data?.metaobjectUpdate;

        if (!result) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Shopify: missing metaobjectUpdate.'
            });
        }

        if (result.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'shopify_error',
                message: result.userErrors.map((e) => e.message).join('; '),
                errors: result.userErrors
            });
        }

        const metaobject = result.metaobject;

        if (!metaobject) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Metaobject not found or could not be updated.'
            });
        }

        return {
            id: metaobject.id,
            handle: metaobject.handle,
            type: metaobject.type,
            displayName: metaobject.displayName,
            updatedAt: metaobject.updatedAt,
            fields: metaobject.fields.map((field) => ({
                key: field.key,
                ...(field.value != null && { value: field.value })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
