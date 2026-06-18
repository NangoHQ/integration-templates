import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The globally-unique ID of the market to update. Example: "gid://shopify/Market/73827535"'),
    handle: z.string().optional().describe('A unique identifier for the market. Example: "ca"'),
    name: z.string().optional().describe('The name of the market. Not shown to customers.'),
    status: z.enum(['ACTIVE', 'DRAFT', 'INACTIVE']).optional().describe('The status of the market.'),
    catalogsToAdd: z.array(z.string()).optional().describe('Catalog IDs to include in the market.'),
    catalogsToDelete: z.array(z.string()).optional().describe('Catalog IDs to remove from the market.'),
    webPresencesToAdd: z.array(z.string()).optional().describe('The web presences to add to the market.'),
    webPresencesToDelete: z.array(z.string()).optional().describe('The web presences to remove from the market.'),
    conditions: z.record(z.string(), z.unknown()).optional().describe('The conditions to update.'),
    currencySettings: z.record(z.string(), z.unknown()).optional().describe('Currency settings for the market.'),
    priceInclusions: z.record(z.string(), z.unknown()).optional().describe('The strategy used to determine how prices are displayed to the customer.'),
    makeDuplicateUniqueMarketsDraft: z.boolean().optional().describe('Whether to update duplicate region or wildcard markets status to draft.'),
    removeCurrencySettings: z.boolean().optional().describe('Remove any currency settings that are defined for the market.'),
    removePriceInclusions: z.boolean().optional().describe('The price inclusions to remove from the market.')
});

const ProviderMarketSchema = z.object({
    id: z.string(),
    handle: z.string(),
    name: z.string(),
    status: z.string(),
    type: z.string().optional()
});

const ProviderUserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string(),
    code: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        marketUpdate: z.object({
            market: ProviderMarketSchema.nullable(),
            userErrors: z.array(ProviderUserErrorSchema)
        })
    })
});

const OutputSchema = z.object({
    market: z
        .object({
            id: z.string(),
            handle: z.string(),
            name: z.string(),
            status: z.string(),
            type: z.string().optional()
        })
        .optional(),
    userErrors: z.array(
        z.object({
            field: z.array(z.string()).optional(),
            message: z.string(),
            code: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'Update a Shopify market.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_markets', 'write_markets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const marketInput: Record<string, unknown> = {
            ...(input.handle !== undefined && { handle: input.handle }),
            ...(input.name !== undefined && { name: input.name }),
            ...(input.status !== undefined && { status: input.status }),
            ...(input.catalogsToAdd !== undefined && { catalogsToAdd: input.catalogsToAdd }),
            ...(input.catalogsToDelete !== undefined && { catalogsToDelete: input.catalogsToDelete }),
            ...(input.webPresencesToAdd !== undefined && { webPresencesToAdd: input.webPresencesToAdd }),
            ...(input.webPresencesToDelete !== undefined && { webPresencesToDelete: input.webPresencesToDelete }),
            ...(input.conditions !== undefined && { conditions: input.conditions }),
            ...(input.currencySettings !== undefined && { currencySettings: input.currencySettings }),
            ...(input.priceInclusions !== undefined && { priceInclusions: input.priceInclusions }),
            ...(input.makeDuplicateUniqueMarketsDraft !== undefined && { makeDuplicateUniqueMarketsDraft: input.makeDuplicateUniqueMarketsDraft }),
            ...(input.removeCurrencySettings !== undefined && { removeCurrencySettings: input.removeCurrencySettings }),
            ...(input.removePriceInclusions !== undefined && { removePriceInclusions: input.removePriceInclusions })
        };

        // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/marketUpdate
        const response = await nango.post({
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    mutation marketUpdate($id: ID!, $input: MarketUpdateInput!) {
                        marketUpdate(id: $id, input: $input) {
                            market {
                                id
                                handle
                                name
                                status
                                type
                            }
                            userErrors {
                                field
                                message
                                code
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id,
                    input: marketInput
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const marketUpdate = providerResponse.data.marketUpdate;

        return {
            ...(marketUpdate.market != null && {
                market: {
                    id: marketUpdate.market.id,
                    handle: marketUpdate.market.handle,
                    name: marketUpdate.market.name,
                    status: marketUpdate.market.status,
                    ...(marketUpdate.market.type != null && { type: marketUpdate.market.type })
                }
            }),
            userErrors: marketUpdate.userErrors.map((error) => ({
                ...(error.field != null && { field: error.field }),
                message: error.message,
                ...(error.code != null && { code: error.code })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
