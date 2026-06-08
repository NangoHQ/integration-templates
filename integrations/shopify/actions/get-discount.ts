import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The GraphQL ID of the DiscountNode. Example: "gid://shopify/DiscountNode/123456789"')
});

const ProviderDiscountSchema = z.object({
    __typename: z.string(),
    title: z.string(),
    status: z.string(),
    summary: z.string().optional().nullable()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            discountNode: z
                .object({
                    id: z.string(),
                    discount: ProviderDiscountSchema.nullable()
                })
                .nullable()
        })
        .optional(),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    status: z.string(),
    summary: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a Shopify discount node by GraphQL ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-discount',
        group: 'Discounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query discountNode($id: ID!) {
                discountNode(id: $id) {
                    id
                    discount {
                        __typename
                        ... on DiscountCodeBasic {
                            title
                            summary
                            status
                        }
                        ... on DiscountAutomaticBasic {
                            title
                            summary
                            status
                        }
                        ... on DiscountCodeBxgy {
                            title
                            summary
                            status
                        }
                        ... on DiscountAutomaticBxgy {
                            title
                            summary
                            status
                        }
                        ... on DiscountCodeFreeShipping {
                            title
                            summary
                            status
                        }
                        ... on DiscountCodeApp {
                            title
                            status
                        }
                        ... on DiscountAutomaticApp {
                            title
                            status
                        }
                    }
                }
            }
        `;

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-10/queries/discountNode
            endpoint: 'admin/api/2025-10/graphql.json',
            data: {
                query,
                variables: { id: input.id }
            },
            retries: 3
        });

        const body = ProviderResponseSchema.parse(response.data);

        const firstError = body.errors?.[0];
        if (firstError) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstError.message,
                id: input.id
            });
        }

        const discountNode = body.data?.discountNode;
        if (!discountNode || !discountNode.discount) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Discount not found',
                id: input.id
            });
        }

        const discount = discountNode.discount;

        return {
            id: discountNode.id,
            type: discount.__typename,
            title: discount.title,
            status: discount.status,
            ...(discount.summary != null && { summary: discount.summary })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
