import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the code discount to delete. Example: "gid://shopify/DiscountCodeNode/123"')
});

const ProviderDiscountUserErrorSchema = z.object({
    field: z.array(z.string()).optional().nullable(),
    code: z.string().optional().nullable(),
    message: z.string().optional().nullable()
});

const ProviderDiscountCodeDeletePayloadSchema = z.object({
    deletedCodeDiscountId: z.string().optional().nullable(),
    userErrors: z.array(ProviderDiscountUserErrorSchema)
});

const OutputSchema = z.object({
    deletedCodeDiscountId: z.string().optional(),
    userErrors: z.array(
        z.object({
            field: z.array(z.string()).optional(),
            code: z.string().optional(),
            message: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'Delete a code-based Shopify discount.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-discount-code',
        group: 'Discounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-01/mutations/discountCodeDelete
            endpoint: '/admin/api/2026-01/graphql.json',
            data: {
                query: `mutation discountCodeDelete($id: ID!) {
                    discountCodeDelete(id: $id) {
                        deletedCodeDiscountId
                        userErrors {
                            field
                            code
                            message
                        }
                    }
                }`,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        const body = z
            .object({
                data: z.object({
                    discountCodeDelete: ProviderDiscountCodeDeletePayloadSchema
                })
            })
            .parse(response.data);

        const payload = body.data.discountCodeDelete;

        return {
            ...(payload.deletedCodeDiscountId != null && { deletedCodeDiscountId: payload.deletedCodeDiscountId }),
            userErrors: payload.userErrors.map((error) => ({
                ...(error.field != null && { field: error.field }),
                ...(error.code != null && { code: error.code }),
                ...(error.message != null && { message: error.message })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
