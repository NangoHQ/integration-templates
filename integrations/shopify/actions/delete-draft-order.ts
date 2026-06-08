import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Draft order GID. Example: "gid://shopify/DraftOrder/1234567890"')
});

const ProviderUserErrorSchema = z.object({
    field: z.array(z.string()).nullable().optional(),
    message: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        draftOrderDelete: z.object({
            deletedId: z.string().nullable().optional(),
            userErrors: z.array(ProviderUserErrorSchema)
        })
    })
});

const OutputSchema = z.object({
    deletedId: z.string().optional(),
    userErrors: z.array(
        z.object({
            field: z.array(z.string()).optional(),
            message: z.string()
        })
    )
});

const action = createAction({
    description: 'Delete a Shopify draft order.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-draft-order',
        group: 'Draft Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_draft_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/draftOrderDelete
            endpoint: '/admin/api/2025-01/graphql.json',
            data: {
                query: `
                    mutation draftOrderDelete($input: DraftOrderDeleteInput!) {
                        draftOrderDelete(input: $input) {
                            deletedId
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
        const draftOrderDelete = payload.data.draftOrderDelete;

        return {
            ...(draftOrderDelete.deletedId != null && { deletedId: draftOrderDelete.deletedId }),
            userErrors: draftOrderDelete.userErrors.map((error) => ({
                ...(error.field != null && { field: error.field }),
                message: error.message
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
