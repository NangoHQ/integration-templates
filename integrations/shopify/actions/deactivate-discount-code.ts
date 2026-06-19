import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    discountNodeId: z.string().describe('The globally unique ID of the discount code node to deactivate. Example: gid://shopify/DiscountCodeNode/123')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).nullable().optional(),
    code: z.string().nullable().optional(),
    message: z.string()
});

const OutputSchema = z.object({
    status: z.string().optional(),
    userErrors: z.array(UserErrorSchema)
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        discountCodeDeactivate: z.object({
            codeDiscountNode: z
                .object({
                    id: z.string().optional(),
                    codeDiscount: z
                        .object({
                            status: z.string().optional()
                        })
                        .optional()
                })
                .optional(),
            userErrors: z.array(UserErrorSchema)
        })
    })
});

const action = createAction({
    description: 'Deactivate a code-based Shopify discount.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/discountCodeDeactivate
            endpoint: 'admin/api/2026-04/graphql.json',
            data: {
                query: `mutation discountCodeDeactivate($id: ID!) {
  discountCodeDeactivate(id: $id) {
    codeDiscountNode {
      id
      codeDiscount {
        ... on DiscountCodeBasic { status }
        ... on DiscountCodeBxgy { status }
        ... on DiscountCodeFreeShipping { status }
        ... on DiscountCodeApp { status }
      }
    }
    userErrors {
      field
      code
      message
    }
  }
}`,
                variables: {
                    id: input.discountNodeId
                }
            },
            retries: 3
        });

        const body = GraphQLResponseSchema.parse(response.data);
        const result = body.data.discountCodeDeactivate;

        return {
            ...(result.codeDiscountNode?.codeDiscount?.status != null && {
                status: result.codeDiscountNode.codeDiscount.status
            }),
            userErrors: result.userErrors.map((err) => ({
                ...(err.field != null && { field: err.field }),
                ...(err.code != null && { code: err.code }),
                message: err.message
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
