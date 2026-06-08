import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderShopSchema = z.object({
    name: z.string(),
    email: z.string().optional(),
    myshopifyDomain: z.string().optional(),
    currencyCode: z.string().optional(),
    plan: z
        .object({
            displayName: z.string().optional(),
            partnerDevelopment: z.boolean().optional(),
            shopifyPlus: z.boolean().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    name: z.string(),
    email: z.string().optional(),
    myshopifyDomain: z.string().optional(),
    currencyCode: z.string().optional(),
    plan: z
        .object({
            displayName: z.string().optional(),
            partnerDevelopment: z.boolean().optional(),
            shopifyPlus: z.boolean().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve Shopify shop metadata for the connected store.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-shop',
        group: 'Shop'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-01/queries/shop
            endpoint: '/admin/api/2025-01/graphql.json',
            data: {
                query: `
                    query {
                        shop {
                            name
                            email
                            myshopifyDomain
                            currencyCode
                            plan {
                                displayName
                                partnerDevelopment
                                shopifyPlus
                            }
                        }
                    }
                `
            },
            retries: 3
        });

        const graphQLResponse = z
            .object({
                data: z
                    .object({
                        shop: z.unknown()
                    })
                    .optional(),
                errors: z.array(z.unknown()).optional()
            })
            .parse(response.data);

        if (graphQLResponse.errors && graphQLResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'Shopify GraphQL query returned errors',
                errors: graphQLResponse.errors
            });
        }

        if (!graphQLResponse.data || !graphQLResponse.data.shop) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Shop data not found in response'
            });
        }

        const shop = ProviderShopSchema.parse(graphQLResponse.data.shop);

        return {
            name: shop.name,
            ...(shop.email !== undefined && { email: shop.email }),
            ...(shop.myshopifyDomain !== undefined && { myshopifyDomain: shop.myshopifyDomain }),
            ...(shop.currencyCode !== undefined && { currencyCode: shop.currencyCode }),
            ...(shop.plan !== undefined && {
                plan: {
                    ...(shop.plan.displayName !== undefined && { displayName: shop.plan.displayName }),
                    ...(shop.plan.partnerDevelopment !== undefined && { partnerDevelopment: shop.plan.partnerDevelopment }),
                    ...(shop.plan.shopifyPlus !== undefined && { shopifyPlus: shop.plan.shopifyPlus })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
