import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(250).optional().describe('Number of draft orders to return per page. Maximum 250.'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    sortKey: z.enum(['CREATED_AT', 'CUSTOMER_NAME', 'ID', 'NUMBER', 'TOTAL_PRICE', 'UPDATED_AT']).optional().describe('Sort key for ordering results.'),
    reverse: z.boolean().optional().describe('Reverse the order of results.'),
    query: z.string().optional().describe('Filter query using Shopify search syntax.')
});

const MoneySchema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const MoneyBagSchema = z.object({
    shopMoney: MoneySchema.optional(),
    presentmentMoney: MoneySchema.optional()
});

const CustomerSchema = z.object({
    id: z.string().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    email: z.string().nullable().optional()
});

const LineItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    quantity: z.number().optional(),
    sku: z.string().nullable().optional(),
    variant: z
        .object({
            id: z.string().optional(),
            title: z.string().optional()
        })
        .nullable()
        .optional(),
    product: z
        .object({
            id: z.string().optional()
        })
        .nullable()
        .optional()
});

const DraftOrderSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable().optional(),
    status: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    completedAt: z.string().nullable().optional(),
    invoiceSentAt: z.string().nullable().optional(),
    invoiceUrl: z.string().nullable().optional(),
    currencyCode: z.string(),
    presentmentCurrencyCode: z.string().nullable().optional(),
    taxesIncluded: z.boolean(),
    taxExempt: z.boolean(),
    tags: z.array(z.string()),
    note2: z.string().nullable().optional(),
    subtotalPriceSet: MoneyBagSchema.nullable().optional(),
    totalPriceSet: MoneyBagSchema.nullable().optional(),
    totalTaxSet: MoneyBagSchema.nullable().optional(),
    totalShippingPriceSet: MoneyBagSchema.nullable().optional(),
    totalDiscountsSet: MoneyBagSchema.nullable().optional(),
    customer: CustomerSchema.nullable().optional(),
    lineItems: z
        .object({
            edges: z.array(
                z.object({
                    node: LineItemSchema,
                    cursor: z.string().optional()
                })
            )
        })
        .optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            draftOrders: z.object({
                edges: z.array(
                    z.object({
                        node: DraftOrderSchema,
                        cursor: z.string().optional()
                    })
                ),
                pageInfo: z.object({
                    hasNextPage: z.boolean(),
                    endCursor: z.string().nullable().optional()
                })
            })
        })
        .nullable()
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                extensions: z
                    .object({
                        code: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    items: z.array(DraftOrderSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List Shopify draft orders with cursor pagination.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_draft_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query DraftOrders($first: Int, $after: String, $sortKey: DraftOrderSortKeys, $reverse: Boolean, $query: String) {
                draftOrders(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
                    edges {
                        node {
                            id
                            name
                            email
                            status
                            createdAt
                            updatedAt
                            completedAt
                            invoiceSentAt
                            invoiceUrl
                            currencyCode
                            presentmentCurrencyCode
                            taxesIncluded
                            taxExempt
                            tags
                            note2
                            subtotalPriceSet {
                                shopMoney { amount currencyCode }
                                presentmentMoney { amount currencyCode }
                            }
                            totalPriceSet {
                                shopMoney { amount currencyCode }
                                presentmentMoney { amount currencyCode }
                            }
                            totalTaxSet {
                                shopMoney { amount currencyCode }
                                presentmentMoney { amount currencyCode }
                            }
                            totalShippingPriceSet {
                                shopMoney { amount currencyCode }
                                presentmentMoney { amount currencyCode }
                            }
                            totalDiscountsSet {
                                shopMoney { amount currencyCode }
                                presentmentMoney { amount currencyCode }
                            }
                            customer {
                                id
                                firstName
                                lastName
                                email
                            }
                            lineItems(first: 10) {
                                edges {
                                    node {
                                        id
                                        name
                                        quantity
                                        sku
                                        variant { id title }
                                        product { id }
                                    }
                                    cursor
                                }
                            }
                        }
                        cursor
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `;

        const variables: {
            first?: number;
            after?: string;
            sortKey?: string;
            reverse?: boolean;
            query?: string;
        } = {};
        if (input.first !== undefined) {
            variables.first = input.first;
        }
        if (input.after !== undefined) {
            variables.after = input.after;
        }
        if (input.sortKey !== undefined) {
            variables.sortKey = input.sortKey;
        }
        if (input.reverse !== undefined) {
            variables.reverse = input.reverse;
        }
        if (input.query !== undefined) {
            variables.query = input.query;
        }

        // https://shopify.dev/docs/api/admin-graphql/2025-04/queries/draftOrders
        const response = await nango.post({
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query,
                variables
            },
            retries: 3
        });

        const parsed = GraphQLResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: parsed.errors.map((err) => err.message).join(', ')
            });
        }

        const draftOrders = parsed.data?.draftOrders;
        if (!draftOrders) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No draft orders data returned from Shopify.'
            });
        }

        const items = draftOrders.edges.map((edge) => {
            const node = edge.node;
            return {
                id: node.id,
                name: node.name,
                status: node.status,
                createdAt: node.createdAt,
                updatedAt: node.updatedAt,
                currencyCode: node.currencyCode,
                taxesIncluded: node.taxesIncluded,
                taxExempt: node.taxExempt,
                tags: node.tags,
                ...(node.email != null && { email: node.email }),
                ...(node.completedAt != null && { completedAt: node.completedAt }),
                ...(node.invoiceSentAt != null && { invoiceSentAt: node.invoiceSentAt }),
                ...(node.invoiceUrl != null && { invoiceUrl: node.invoiceUrl }),
                ...(node.presentmentCurrencyCode != null && { presentmentCurrencyCode: node.presentmentCurrencyCode }),
                ...(node.note2 != null && { note2: node.note2 }),
                ...(node.subtotalPriceSet != null && { subtotalPriceSet: node.subtotalPriceSet }),
                ...(node.totalPriceSet != null && { totalPriceSet: node.totalPriceSet }),
                ...(node.totalTaxSet != null && { totalTaxSet: node.totalTaxSet }),
                ...(node.totalShippingPriceSet != null && { totalShippingPriceSet: node.totalShippingPriceSet }),
                ...(node.totalDiscountsSet != null && { totalDiscountsSet: node.totalDiscountsSet }),
                ...(node.customer != null && { customer: node.customer }),
                ...(node.lineItems != null && { lineItems: node.lineItems })
            };
        });

        return {
            items,
            ...(draftOrders.pageInfo.hasNextPage && draftOrders.pageInfo.endCursor != null && { nextCursor: draftOrders.pageInfo.endCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
