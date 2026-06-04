import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(250).optional().describe('Number of records to return. Max 250.'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    sortKey: z.string().optional().describe('Sort key for the underlying list. Example: "ID", "NAME", "CREATED_AT", "UPDATED_AT", "CUSTOMER_SINCE".'),
    reverse: z.boolean().optional().describe('Reverse the order of the underlying list.'),
    query: z.string().optional().describe('A filter made up of terms, connectives, modifiers, and comparators.')
});

const ProviderMoneySchema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const ProviderCountSchema = z.object({
    count: z.number().int(),
    precision: z.string().optional()
});

const ProviderCompanySchema = z.object({
    id: z.string(),
    name: z.string(),
    externalId: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    customerSince: z.string().optional(),
    note: z.string().nullable().optional(),
    totalSpent: ProviderMoneySchema.optional(),
    ordersCount: ProviderCountSchema.nullable().optional(),
    locationsCount: ProviderCountSchema.nullable().optional()
});

const ProviderPageInfoSchema = z.object({
    endCursor: z.string().nullable().optional(),
    hasNextPage: z.boolean()
});

const ProviderCompaniesConnectionSchema = z.object({
    nodes: z.array(ProviderCompanySchema),
    pageInfo: ProviderPageInfoSchema
});

const GraphQLErrorSchema = z.object({
    message: z.string()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            companies: ProviderCompaniesConnectionSchema
        })
        .optional(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const CompanyOutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    externalId: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    customerSince: z.string().optional(),
    note: z.string().optional(),
    totalSpent: z
        .object({
            amount: z.string(),
            currencyCode: z.string()
        })
        .optional(),
    ordersCount: z.number().int().optional(),
    locationsCount: z.number().int().optional()
});

const OutputSchema = z.object({
    companies: z.array(CompanyOutputSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List Shopify B2B companies with cursor pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-companies',
        group: 'Companies'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_companies', 'read_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query Companies($first: Int, $after: String, $sortKey: CompanySortKeys, $reverse: Boolean, $query: String) {
                companies(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
                    nodes {
                        id
                        name
                        externalId
                        createdAt
                        updatedAt
                        customerSince
                        note
                        totalSpent {
                            amount
                            currencyCode
                        }
                        ordersCount {
                            count
                            precision
                        }
                        locationsCount {
                            count
                            precision
                        }
                    }
                    pageInfo {
                        endCursor
                        hasNextPage
                    }
                }
            }
        `;

        // https://shopify.dev/docs/api/admin-graphql/2025-01/queries/companies
        const response = await nango.post({
            endpoint: '/admin/api/2025-01/graphql.json',
            data: {
                query,
                variables: {
                    ...(input.first !== undefined && { first: input.first }),
                    ...(input.after !== undefined && { after: input.after }),
                    ...(input.sortKey !== undefined && { sortKey: input.sortKey }),
                    ...(input.reverse !== undefined && { reverse: input.reverse }),
                    ...(input.query !== undefined && { query: input.query })
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors != null && providerResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: providerResponse.errors.map((err) => err.message).join('; ')
            });
        }

        if (providerResponse.data == null) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Provider returned an empty response.'
            });
        }

        const companies = providerResponse.data.companies.nodes.map((node) => {
            return {
                id: node.id,
                name: node.name,
                createdAt: node.createdAt,
                updatedAt: node.updatedAt,
                ...(node.externalId != null && { externalId: node.externalId }),
                ...(node.customerSince != null && { customerSince: node.customerSince }),
                ...(node.note != null && { note: node.note }),
                ...(node.totalSpent != null && {
                    totalSpent: {
                        amount: node.totalSpent.amount,
                        currencyCode: node.totalSpent.currencyCode
                    }
                }),
                ...(node.ordersCount != null && { ordersCount: node.ordersCount.count }),
                ...(node.locationsCount != null && { locationsCount: node.locationsCount.count })
            };
        });

        const pageInfo = providerResponse.data.companies.pageInfo;

        return {
            companies,
            ...(pageInfo.hasNextPage && pageInfo.endCursor != null && { nextCursor: pageInfo.endCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
