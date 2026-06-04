import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The global ID of the metafield definition to delete. Example: "gid://shopify/MetafieldDefinition/1071456130"'),
    deleteAllAssociatedMetafields: z
        .boolean()
        .optional()
        .describe('Whether to delete all associated metafields. Must be true when deleting definitions under the $app namespace.')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string().optional(),
    code: z.string().optional()
});

const OutputSchema = z.object({
    deletedDefinitionId: z.string().optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Delete a Shopify metafield definition.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-metafield-definition'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/metafieldDefinitionDelete
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    mutation DeleteMetafieldDefinition($id: ID!, $deleteAllAssociatedMetafields: Boolean!) {
                        metafieldDefinitionDelete(id: $id, deleteAllAssociatedMetafields: $deleteAllAssociatedMetafields) {
                            deletedDefinitionId
                            userErrors {
                                field
                                message
                                code
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id,
                    deleteAllAssociatedMetafields: input.deleteAllAssociatedMetafields ?? false
                }
            },
            retries: 1
        });

        const payload = z
            .object({
                data: z.object({
                    metafieldDefinitionDelete: z.object({
                        deletedDefinitionId: z.string().nullable().optional(),
                        userErrors: z.array(
                            z.object({
                                field: z.array(z.string()).nullable().optional(),
                                message: z.string().nullable().optional(),
                                code: z.string().nullable().optional()
                            })
                        )
                    })
                })
            })
            .parse(response.data);

        const result = payload.data.metafieldDefinitionDelete;

        return {
            ...(result.deletedDefinitionId != null && { deletedDefinitionId: result.deletedDefinitionId }),
            userErrors: result.userErrors.map((error) => ({
                ...(error.field != null && { field: error.field }),
                ...(error.message != null && { message: error.message }),
                ...(error.code != null && { code: error.code })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
