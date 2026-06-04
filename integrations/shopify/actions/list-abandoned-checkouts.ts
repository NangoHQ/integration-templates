import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(250).optional().describe('Number of items to return. Max 250. Default: 50'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    query: z.string().optional().describe('Shopify search query filter. Example: created_at:>2024-01-01 or updated_at:>2024-01-01')
});

const ProviderCustomerSchema = z.object({
    firstName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),
    email: z.string().optional().nullable()
});

const ProviderMailingAddressSchema = z.object({
    country: z.string().optional().nullable()
});

const ProviderAbandonedCheckoutSchema = z.object({
    id: z.string(),
    abandonedCheckoutUrl: z.string().optional().nullable(),
    billingAddress: ProviderMailingAddressSchema.optional().nullable(),
    completedAt: z.string().optional().nullable(),
    createdAt: z.string(),
    customer: ProviderCustomerSchema.optional().nullable(),
    name: z.string(),
    shippingAddress: ProviderMailingAddressSchema.optional().nullable(),
    updatedAt: z.string()
});

const AbandonedCheckoutSchema = z.object({
    id: z.string(),
    abandoned_checkout_url: z.string().optional(),
    billing_address: z.object({ country: z.string().optional() }).optional(),
    completed_at: z.string().optional(),
    created_at: z.string(),
    customer: z.object({ first_name: z.string().optional(), last_name: z.string().optional(), email: z.string().optional() }).optional(),
    name: z.string(),
    shipping_address: z.object({ country: z.string().optional() }).optional(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    items: z.array(AbandonedCheckoutSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List abandoned checkouts in a Shopify store.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-abandoned-checkouts',
        group: 'Abandoned Checkouts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_orders'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query AbandonedCheckouts($first: Int, $after: String, $query: String) {
                abandonedCheckouts(first: $first, after: $after, query: $query) {
                    nodes {
                        id
                        abandonedCheckoutUrl
                        billingAddress {
                            country
                        }
                        completedAt
                        createdAt
                        customer {
                            firstName
                            lastName
                            email
                        }
                        name
                        shippingAddress {
                            country
                        }
                        updatedAt
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `;

        const variables: Record<string, unknown> = {
            first: input.first ?? 50
        };

        if (input.after !== undefined) {
            variables['after'] = input.after;
        }

        if (input.query !== undefined) {
            variables['query'] = input.query;
        }

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-04/queries/abandonedCheckouts
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query,
                variables
            },
            retries: 3
        });

        const body = z
            .object({
                data: z.object({
                    abandonedCheckouts: z.object({
                        nodes: z.array(ProviderAbandonedCheckoutSchema),
                        pageInfo: z.object({
                            hasNextPage: z.boolean(),
                            endCursor: z.string().optional().nullable()
                        })
                    })
                })
            })
            .parse(response.data);

        const nodes = body.data.abandonedCheckouts.nodes;
        const pageInfo = body.data.abandonedCheckouts.pageInfo;

        return {
            items: nodes.map((node) => ({
                id: node.id,
                ...(node.abandonedCheckoutUrl != null && { abandoned_checkout_url: node.abandonedCheckoutUrl }),
                ...(node.billingAddress != null && {
                    billing_address: {
                        ...(node.billingAddress.country != null && { country: node.billingAddress.country })
                    }
                }),
                ...(node.completedAt != null && { completed_at: node.completedAt }),
                created_at: node.createdAt,
                ...(node.customer != null && {
                    customer: {
                        ...(node.customer.firstName != null && { first_name: node.customer.firstName }),
                        ...(node.customer.lastName != null && { last_name: node.customer.lastName }),
                        ...(node.customer.email != null && { email: node.customer.email })
                    }
                }),
                name: node.name,
                ...(node.shippingAddress != null && {
                    shipping_address: {
                        ...(node.shippingAddress.country != null && { country: node.shippingAddress.country })
                    }
                }),
                updated_at: node.updatedAt
            })),
            ...(pageInfo.hasNextPage && pageInfo.endCursor != null ? { next_cursor: pageInfo.endCursor } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
