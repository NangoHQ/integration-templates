import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const RegionInputSchema = z.object({
    countryCode: z.string()
});

const InputSchema = z.object({
    name: z.string().describe('The name of the market. Not shown to customers.'),
    handle: z.string().optional().describe('A unique identifier for the market.'),
    regions: z.array(RegionInputSchema).optional().describe('Regions to include in the market condition.')
});

const MarketSchema = z.object({
    id: z.string(),
    handle: z.string(),
    name: z.string(),
    status: z.string().optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).nullable().optional(),
    message: z.string(),
    code: z.string().nullable().optional()
});

const OutputSchema = z.object({
    market: MarketSchema.nullable().optional(),
    userErrors: z.array(UserErrorSchema)
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            marketCreate: z
                .object({
                    market: MarketSchema.nullable().optional(),
                    userErrors: z.array(UserErrorSchema)
                })
                .nullable()
                .optional()
        })
        .nullable()
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Create a Shopify market for international selling.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-market',
        group: 'Markets'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_markets', 'write_markets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation marketCreate($input: MarketCreateInput!) {
                marketCreate(input: $input) {
                    market {
                        id
                        handle
                        name
                        status
                    }
                    userErrors {
                        field
                        message
                        code
                    }
                }
            }
        `;

        const variables = {
            input: {
                name: input.name,
                ...(input.handle !== undefined && { handle: input.handle }),
                ...(input.regions !== undefined && {
                    conditions: {
                        regionsCondition: {
                            regions: input.regions
                        }
                    }
                })
            }
        };

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2025-10/mutations/marketCreate
            endpoint: '/admin/api/2025-10/graphql.json',
            data: {
                query,
                variables
            },
            retries: 10
        };

        const response = await nango.post(config);

        const parsed = GraphQLResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Shopify API'
            });
        }

        const marketCreate = parsed.data.data?.marketCreate;
        if (!marketCreate) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL mutation failed',
                errors: parsed.data.errors ?? []
            });
        }

        return {
            market: marketCreate.market ?? null,
            userErrors: marketCreate.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
