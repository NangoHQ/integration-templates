import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the metaobject to delete. Example: "gid://shopify/Metaobject/515107504"')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string(),
    code: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            metaobjectDelete: z.object({
                deletedId: z.string().nullable().optional(),
                userErrors: z.array(UserErrorSchema)
            })
        })
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    deletedId: z.string().optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Delete a Shopify metaobject entry.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_metaobjects'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-01/mutations/metaobjectDelete
            endpoint: '/admin/api/2026-01/graphql.json',
            data: {
                query: `
                    mutation DeleteMetaobject($id: ID!) {
                        metaobjectDelete(id: $id) {
                            deletedId
                            userErrors {
                                field
                                message
                                code
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

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL errors occurred from the Shopify API',
                errors: providerResponse.errors
            });
        }

        const result = providerResponse.data?.metaobjectDelete;

        if (!result) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Shopify GraphQL API'
            });
        }

        return {
            ...(result.deletedId != null && { deletedId: result.deletedId }),
            userErrors: result.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
