import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(250).optional().describe('Number of items to return per page. Maximum 250.'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    sortKey: z
        .enum(['CREATED_AT', 'CUSTOMER_SINCE', 'EMAIL', 'ID', 'LOCATION', 'NAME', 'RELEVANCE', 'UPDATED_AT'])
        .optional()
        .describe('Sort key for the results.'),
    reverse: z.boolean().optional().describe('Reverse the order of the results.'),
    query: z.string().optional().describe('Search query string for filtering customers.')
});

const ProviderDefaultEmailAddressSchema = z.object({
    emailAddress: z.string().nullish()
});

const ProviderDefaultPhoneNumberSchema = z.object({
    phoneNumber: z.string().nullish()
});

const ProviderCustomerSchema = z.object({
    id: z.string(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    defaultEmailAddress: ProviderDefaultEmailAddressSchema.nullish(),
    defaultPhoneNumber: ProviderDefaultPhoneNumberSchema.nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish(),
    state: z.string().nullish(),
    numberOfOrders: z.number().int().nullish()
});

const ProviderEdgeSchema = z.object({
    cursor: z.string(),
    node: ProviderCustomerSchema
});

const ProviderPageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable().optional()
});

const ProviderCustomersConnectionSchema = z.object({
    edges: z.array(ProviderEdgeSchema),
    pageInfo: ProviderPageInfoSchema
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            customers: ProviderCustomersConnectionSchema
        })
        .nullable()
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                extensions: z.record(z.string(), z.unknown()).optional()
            })
        )
        .optional()
});

const CustomerOutputSchema = z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    emailAddress: z.string().optional(),
    phoneNumber: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    state: z.string().optional(),
    numberOfOrders: z.number().int().optional()
});

const OutputSchema = z.object({
    customers: z.array(CustomerOutputSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List Shopify customers with cursor pagination and optional search query.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const first = input.first ?? 10;

        const graphQuery = `
            query ($first: Int!, $after: String, $sortKey: CustomerSortKeys, $reverse: Boolean, $query: String) {
                customers(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
                    edges {
                        cursor
                        node {
                            id
                            firstName
                            lastName
                            defaultEmailAddress {
                                emailAddress
                            }
                            defaultPhoneNumber {
                                phoneNumber
                            }
                            createdAt
                            updatedAt
                            state
                            numberOfOrders
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `;

        const variables: {
            first: number;
            after?: string;
            sortKey?: string;
            reverse?: boolean;
            query?: string;
        } = {
            first
        };

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

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/latest/queries/customers
            endpoint: '/admin/api/2025-07/graphql.json',
            data: {
                query: graphQuery,
                variables
            },
            retries: 3
        };

        const response = await nango.post(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.errors.map((e) => e.message).join('; ')
            });
        }

        if (!providerResponse.data) {
            throw new nango.ActionError({
                type: 'no_data',
                message: 'No data returned from the provider.'
            });
        }

        const customers = providerResponse.data.customers.edges.map((edge) => {
            const node = edge.node;
            return {
                id: node.id,
                ...(node.firstName != null && { firstName: node.firstName }),
                ...(node.lastName != null && { lastName: node.lastName }),
                ...(node.defaultEmailAddress?.emailAddress != null && { emailAddress: node.defaultEmailAddress.emailAddress }),
                ...(node.defaultPhoneNumber?.phoneNumber != null && { phoneNumber: node.defaultPhoneNumber.phoneNumber }),
                ...(node.createdAt != null && { createdAt: node.createdAt }),
                ...(node.updatedAt != null && { updatedAt: node.updatedAt }),
                ...(node.state != null && { state: node.state }),
                ...(node.numberOfOrders != null && { numberOfOrders: node.numberOfOrders })
            };
        });

        return {
            customers,
            ...(providerResponse.data.customers.pageInfo.endCursor != null &&
                providerResponse.data.customers.pageInfo.hasNextPage && {
                    nextCursor: providerResponse.data.customers.pageInfo.endCursor
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
