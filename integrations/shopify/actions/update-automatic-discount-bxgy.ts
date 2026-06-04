import { z } from 'zod';
import { createAction } from 'nango';

const DiscountAutomaticBxgyInputSchema = z.object({
    title: z.string().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().nullable().optional(),
    customerBuys: z.object({}).passthrough().optional(),
    customerGets: z.object({}).passthrough().optional(),
    combinesWith: z.object({}).passthrough().optional(),
    context: z.object({}).passthrough().optional(),
    tags: z.array(z.string()).optional(),
    usesPerOrderLimit: z.string().optional()
});

const InputSchema = z.object({
    id: z.string().describe('The ID of the automatic BXGY discount to update. Example: "gid://shopify/DiscountAutomaticNode/123"'),
    automaticBxgyDiscount: DiscountAutomaticBxgyInputSchema
});

const DiscountAutomaticBxgySchema = z.object({
    title: z.string().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().nullable().optional(),
    status: z.string().optional(),
    summary: z.string().optional(),
    usesPerOrderLimit: z.number().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const DiscountAutomaticNodeSchema = z.object({
    id: z.string(),
    automaticDiscount: DiscountAutomaticBxgySchema.optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const OutputSchema = z.object({
    automaticDiscountNode: DiscountAutomaticNodeSchema.optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Update an automatic buy X get Y Shopify discount.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-automatic-discount-bxgy',
        group: 'Discounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_discounts', 'write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation discountAutomaticBxgyUpdate($id: ID!, $automaticBxgyDiscount: DiscountAutomaticBxgyInput!) {
                discountAutomaticBxgyUpdate(id: $id, automaticBxgyDiscount: $automaticBxgyDiscount) {
                    automaticDiscountNode {
                        id
                        automaticDiscount {
                            ... on DiscountAutomaticBxgy {
                                title
                                startsAt
                                endsAt
                                status
                                summary
                                usesPerOrderLimit
                                createdAt
                                updatedAt
                            }
                        }
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            id: input.id,
            automaticBxgyDiscount: input.automaticBxgyDiscount
        };

        // https://shopify.dev/docs/api/admin-graphql/latest/mutations/discountAutomaticBxgyUpdate
        const response = await nango.post({
            endpoint: 'admin/api/2026-04/graphql.json',
            data: {
                query: mutation,
                variables: variables
            },
            retries: 10
        });

        const ResponseSchema = z
            .object({
                data: z
                    .object({
                        discountAutomaticBxgyUpdate: z
                            .object({
                                automaticDiscountNode: z.unknown(),
                                userErrors: z.unknown()
                            })
                            .passthrough()
                    })
                    .passthrough()
            })
            .passthrough();

        const parsed = ResponseSchema.parse(response.data);
        const updateResult = parsed.data.discountAutomaticBxgyUpdate;
        const automaticDiscountNodeRaw = updateResult.automaticDiscountNode;
        const userErrorsRaw = updateResult.userErrors;

        const userErrors = z.array(UserErrorSchema).parse(userErrorsRaw);

        if (automaticDiscountNodeRaw === null || automaticDiscountNodeRaw === undefined) {
            return {
                userErrors: userErrors
            };
        }

        const automaticDiscountNode = DiscountAutomaticNodeSchema.parse(automaticDiscountNodeRaw);

        return {
            automaticDiscountNode: automaticDiscountNode,
            userErrors: userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
