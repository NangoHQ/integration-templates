import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the metaobject definition to delete. Example: "gid://shopify/MetaobjectDefinition/123"')
});

const ProviderUserErrorSchema = z.object({
    field: z.array(z.string()).optional().nullable(),
    message: z.string().optional().nullable(),
    code: z.string().optional().nullable()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            metaobjectDefinitionDelete: z
                .object({
                    deletedId: z.string().optional().nullable(),
                    userErrors: z.array(ProviderUserErrorSchema).optional().nullable()
                })
                .optional()
                .nullable()
        })
        .optional()
        .nullable(),
    errors: z
        .array(
            z.object({
                message: z.string().optional().nullable(),
                extensions: z
                    .object({
                        code: z.string().optional().nullable()
                    })
                    .optional()
                    .nullable()
            })
        )
        .optional()
        .nullable()
});

const OutputSchema = z.object({
    deletedId: z.string().optional(),
    userErrors: z.array(
        z.object({
            field: z.array(z.string()).optional(),
            message: z.string().optional(),
            code: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'Delete a Shopify metaobject definition.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-metaobject-definition',
        group: 'Metaobjects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_metaobject_definitions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/latest/mutations/metaobjectDefinitionDelete
            endpoint: 'admin/api/2026-04/graphql.json',
            data: {
                query: `
                    mutation DeleteMetaobjectDefinition($id: ID!) {
                        metaobjectDefinitionDelete(id: $id) {
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

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.errors) {
            const firstError = parsed.errors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: 'graphql_error',
                    message: firstError.message || 'Unknown GraphQL error',
                    code: firstError.extensions?.code || undefined
                });
            }
        }

        if (!parsed.data || !parsed.data.metaobjectDefinitionDelete) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Shopify GraphQL API'
            });
        }

        const deleteResult = parsed.data.metaobjectDefinitionDelete;

        return {
            ...(deleteResult.deletedId != null && { deletedId: deleteResult.deletedId }),
            userErrors: (deleteResult.userErrors || []).map((error) => ({
                ...(error.field != null && { field: error.field }),
                ...(error.message != null && { message: error.message }),
                ...(error.code != null && { code: error.code })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
