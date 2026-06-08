import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The GraphQL ID of the collection to delete. Example: "gid://shopify/Collection/1009501285"')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()),
    message: z.string()
});

const OutputSchema = z.object({
    deletedCollectionId: z.string().optional(),
    userErrors: z.array(UserErrorSchema)
});

const ProviderResponseSchema = z.object({
    data: z.object({
        collectionDelete: z
            .object({
                deletedCollectionId: z.string().nullable().optional(),
                userErrors: z.array(UserErrorSchema)
            })
            .nullable()
    })
});

const action = createAction({
    description: 'Delete a Shopify collection by GraphQL ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-collection',
        group: 'Collections'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-04/mutations/collectionDelete
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query: `
                    mutation collectionDelete($input: CollectionDeleteInput!) {
                        collectionDelete(input: $input) {
                            deletedCollectionId
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                variables: {
                    input: {
                        id: input.id
                    }
                }
            },
            retries: 3
        });

        const payload = ProviderResponseSchema.parse(response.data);
        const collectionDelete = payload.data.collectionDelete;

        if (!collectionDelete) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'The collectionDelete mutation returned null. This can happen when the shop plan does not allow collection deletion.'
            });
        }

        return {
            ...(collectionDelete.deletedCollectionId != null && { deletedCollectionId: collectionDelete.deletedCollectionId }),
            userErrors: collectionDelete.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
