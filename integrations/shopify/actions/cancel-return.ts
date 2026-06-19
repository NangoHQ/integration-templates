import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    returnId: z.string().describe('The ID of the return to cancel. Example: "gid://shopify/Return/123"')
});

const ProviderReturnSchema = z.object({
    id: z.string(),
    status: z.string().optional()
});

const ProviderUserErrorSchema = z.object({
    code: z.string().optional(),
    field: z.array(z.string()).optional(),
    message: z.string()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            returnCancel: z
                .object({
                    return: ProviderReturnSchema.nullable().optional(),
                    userErrors: z.array(ProviderUserErrorSchema).optional()
                })
                .optional()
        })
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    return: ProviderReturnSchema.optional(),
    userErrors: z.array(ProviderUserErrorSchema).optional()
});

const action = createAction({
    description: 'Cancel a return on a Shopify order.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_returns'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/latest/mutations/returnCancel
            endpoint: '/admin/api/2025-10/graphql.json',
            data: {
                query: `
                    mutation returnCancel($id: ID!) {
                        returnCancel(id: $id) {
                            return {
                                id
                                status
                            }
                            userErrors {
                                code
                                field
                                message
                            }
                        }
                    }
                `,
                variables: {
                    id: input.returnId
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'No data returned from Shopify.'
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response format from Shopify.',
                details: parsed.error.message
            });
        }

        const payload = parsed.data;
        if (payload.errors && payload.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL errors occurred.',
                errors: payload.errors
            });
        }

        const returnCancel = payload.data?.returnCancel;
        if (!returnCancel) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'returnCancel data missing in response.'
            });
        }

        return {
            ...(returnCancel.return != null && { return: returnCancel.return }),
            ...(returnCancel.userErrors != null && { userErrors: returnCancel.userErrors })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
