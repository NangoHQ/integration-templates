import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    market_id: z.string().describe('The ID of the market to delete. Example: "gid://shopify/Market/1234567890"')
});

const MarketUserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            marketDelete: z.object({
                deletedId: z.string().nullable().optional(),
                userErrors: z.array(MarketUserErrorSchema)
            })
        })
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    deleted_id: z.string().optional(),
    user_errors: z.array(
        z.object({
            field: z.array(z.string()).optional(),
            message: z.string()
        })
    )
});

const action = createAction({
    description: 'Delete a Shopify market.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_markets', 'write_markets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-04/mutations/marketDelete
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query: `
                    mutation MarketDelete($id: ID!) {
                        marketDelete(id: $id) {
                            deletedId
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                variables: {
                    id: input.market_id
                }
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL errors occurred during market deletion.',
                errors: providerResponse.errors
            });
        }

        const marketDelete = providerResponse.data?.marketDelete;
        if (!marketDelete) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Shopify: marketDelete data is missing.'
            });
        }

        return {
            success: marketDelete.userErrors.length === 0 && marketDelete.deletedId != null,
            ...(marketDelete.deletedId != null && { deleted_id: marketDelete.deletedId }),
            user_errors: marketDelete.userErrors.map((error) => ({
                ...(error.field != null && { field: error.field }),
                message: error.message
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
