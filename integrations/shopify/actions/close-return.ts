import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The globally-unique ID of the return to close. Example: "gid://shopify/Return/1234567890"')
});

const ProviderOrderSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProviderReturnSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    createdAt: z.string(),
    closedAt: z.string().nullable().optional(),
    totalQuantity: z.number(),
    order: ProviderOrderSchema.optional()
});

const ProviderUserErrorSchema = z.object({
    code: z.string().nullable().optional(),
    field: z.array(z.string()).nullable().optional(),
    message: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        returnClose: z.object({
            return: ProviderReturnSchema.nullable().optional(),
            userErrors: z.array(ProviderUserErrorSchema)
        })
    })
});

const OutputSchema = z.object({
    return: z
        .object({
            id: z.string(),
            name: z.string(),
            status: z.string(),
            createdAt: z.string(),
            closedAt: z.string().optional(),
            totalQuantity: z.number(),
            order: z
                .object({
                    id: z.string(),
                    name: z.string()
                })
                .optional()
        })
        .optional(),
    userErrors: z.array(
        z.object({
            code: z.string().optional(),
            field: z.array(z.string()).optional(),
            message: z.string()
        })
    )
});

const action = createAction({
    description: 'Close a return on a Shopify order.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_returns'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation ReturnClose($id: ID!) {
                returnClose(id: $id) {
                    return {
                        id
                        name
                        status
                        createdAt
                        closedAt
                        totalQuantity
                        order {
                            id
                            name
                        }
                    }
                    userErrors {
                        code
                        field
                        message
                    }
                }
            }
        `;

        // https://shopify.dev/docs/api/admin-graphql/2026-01/mutations/returnClose
        const response = await nango.post({
            endpoint: 'admin/api/2026-01/graphql.json',
            data: {
                query,
                variables: {
                    id: input.id
                }
            },
            retries: 1
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const returnData = parsed.data.returnClose.return;
        const userErrors = parsed.data.returnClose.userErrors;

        return {
            ...(returnData && {
                return: {
                    id: returnData.id,
                    name: returnData.name,
                    status: returnData.status,
                    createdAt: returnData.createdAt,
                    ...(returnData.closedAt != null && { closedAt: returnData.closedAt }),
                    totalQuantity: returnData.totalQuantity,
                    ...(returnData.order && { order: returnData.order })
                }
            }),
            userErrors: userErrors.map((error) => ({
                ...(error.code != null && { code: error.code }),
                ...(error.field != null && { field: error.field }),
                message: error.message
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
