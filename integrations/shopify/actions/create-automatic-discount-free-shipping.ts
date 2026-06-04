import { z } from 'zod';
import { createAction } from 'nango';

const DiscountCombinesWithInputSchema = z
    .object({
        orderDiscounts: z.boolean().optional(),
        productDiscounts: z.boolean().optional(),
        shippingDiscounts: z.boolean().optional()
    })
    .optional();

const DiscountContextInputSchema = z
    .object({
        all: z.boolean().optional(),
        customerIds: z
            .object({
                add: z.array(z.string()).optional(),
                remove: z.array(z.string()).optional()
            })
            .optional(),
        customerSegments: z
            .object({
                add: z.array(z.string()).optional(),
                remove: z.array(z.string()).optional()
            })
            .optional()
    })
    .optional();

const DiscountShippingDestinationSelectionInputSchema = z
    .object({
        all: z.boolean().optional(),
        countries: z
            .object({
                add: z.array(z.string()).optional(),
                remove: z.array(z.string()).optional()
            })
            .optional()
    })
    .optional();

const DiscountMinimumRequirementInputSchema = z
    .object({
        quantity: z
            .object({
                greaterThanOrEqualToQuantity: z.string()
            })
            .optional(),
        subtotal: z
            .object({
                greaterThanOrEqualToSubtotal: z.string()
            })
            .optional()
    })
    .optional();

const InputSchema = z.object({
    title: z.string().describe('The discount title. Example: "FREESHIPPING50"'),
    startsAt: z.string().describe('ISO 8601 datetime when the discount becomes active. Example: "2025-01-01T00:00:00Z"'),
    endsAt: z.string().optional().describe('ISO 8601 datetime when the discount expires. Example: "2025-12-31T23:59:59Z"'),
    appliesOnOneTimePurchase: z.boolean().optional().describe('Whether the discount applies on regular one-time-purchase items.'),
    appliesOnSubscription: z.boolean().optional().describe('Whether the discount applies on subscription items.'),
    combinesWith: DiscountCombinesWithInputSchema.describe('Discount classes that can combine with this shipping discount.'),
    context: DiscountContextInputSchema.describe('Context defining which buyers can use the discount.'),
    destination: DiscountShippingDestinationSelectionInputSchema.describe('Destinations where the discount applies.'),
    maximumShippingPrice: z.string().optional().describe('Maximum shipping price that qualifies for the discount. Example: "200"'),
    minimumRequirement: DiscountMinimumRequirementInputSchema.describe('Minimum subtotal or quantity required for the discount.'),
    recurringCycleLimit: z.number().int().optional().describe('Number of billing cycles for subscription-based discounts. 0 means indefinite.'),
    tags: z.array(z.string()).optional().describe('Searchable keywords associated with the discount.')
});

const DiscountNodeSchema = z.object({
    id: z.string()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).nullable().optional(),
    message: z.string(),
    code: z.string().nullable().optional(),
    extraInfo: z.string().nullable().optional()
});

const OutputSchema = z.object({
    automaticDiscountNode: DiscountNodeSchema.optional(),
    userErrors: z.array(UserErrorSchema)
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        discountAutomaticFreeShippingCreate: z.object({
            automaticDiscountNode: DiscountNodeSchema.nullable().optional(),
            userErrors: z.array(UserErrorSchema)
        })
    })
});

const action = createAction({
    description: 'Create an automatic free shipping Shopify discount.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-automatic-discount-free-shipping',
        group: 'Discounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation discountAutomaticFreeShippingCreate($freeShippingAutomaticDiscount: DiscountAutomaticFreeShippingInput!) {
                discountAutomaticFreeShippingCreate(freeShippingAutomaticDiscount: $freeShippingAutomaticDiscount) {
                    automaticDiscountNode {
                        id
                    }
                    userErrors {
                        field
                        message
                        code
                        extraInfo
                    }
                }
            }
        `;

        const variables = {
            freeShippingAutomaticDiscount: {
                title: input.title,
                startsAt: input.startsAt,
                ...(input.endsAt !== undefined && { endsAt: input.endsAt }),
                ...(input.appliesOnOneTimePurchase !== undefined && { appliesOnOneTimePurchase: input.appliesOnOneTimePurchase }),
                ...(input.appliesOnSubscription !== undefined && { appliesOnSubscription: input.appliesOnSubscription }),
                ...(input.combinesWith !== undefined && { combinesWith: input.combinesWith }),
                ...(input.context !== undefined && { context: input.context }),
                ...(input.destination !== undefined && { destination: input.destination }),
                ...(input.maximumShippingPrice !== undefined && { maximumShippingPrice: input.maximumShippingPrice }),
                ...(input.minimumRequirement !== undefined && { minimumRequirement: input.minimumRequirement }),
                ...(input.recurringCycleLimit !== undefined && { recurringCycleLimit: input.recurringCycleLimit }),
                ...(input.tags !== undefined && { tags: input.tags })
            }
        };

        // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/discountAutomaticFreeShippingCreate
        const response = await nango.post({
            endpoint: 'admin/api/2026-04/graphql.json',
            data: {
                query: mutation,
                variables
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Shopify GraphQL API'
            });
        }

        const parsed = GraphQLResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Invalid response structure from Shopify GraphQL API'
            });
        }

        const createResult = parsed.data.data.discountAutomaticFreeShippingCreate;

        return {
            ...(createResult.automaticDiscountNode != null ? { automaticDiscountNode: { id: createResult.automaticDiscountNode.id } } : {}),
            userErrors: createResult.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
