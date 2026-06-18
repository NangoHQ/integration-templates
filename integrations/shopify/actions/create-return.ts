import { z } from 'zod';
import { createAction } from 'nango';

const ReturnLineItemInputSchema = z.object({
    fulfillmentLineItemId: z.string().describe('The ID of the fulfillment line item to be returned. Example: gid://shopify/FulfillmentLineItem/1234567890'),
    quantity: z.number().describe('The quantity of the item to be returned.'),
    returnReasonDefinitionId: z.string().optional().describe('The ID of a ReturnReasonDefinition.'),
    returnReasonNote: z.string().optional().describe('A note about the reason that the item is being returned. Maximum length: 255 characters.'),
    returnReason: z.string().optional().describe('Deprecated. Use returnReasonDefinitionId instead.')
});

const InputSchema = z.object({
    orderId: z.string().describe('The ID of the order to be returned. Example: gid://shopify/Order/1234567890'),
    returnLineItems: z.array(ReturnLineItemInputSchema).describe('The return line items list to be handled.'),
    notifyCustomer: z.boolean().optional().describe('Whether to notify the customer about the return.')
});

const ReturnSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    orderId: z.string(),
    totalQuantity: z.number().optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()),
    message: z.string(),
    code: z.string().optional()
});

const OutputSchema = z.object({
    return: ReturnSchema.optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Create a return for a Shopify order.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_returns', 'write_returns'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const returnLineItems = input.returnLineItems.map((item) => ({
            fulfillmentLineItemId: item.fulfillmentLineItemId,
            quantity: item.quantity,
            ...(item.returnReasonDefinitionId !== undefined && { returnReasonDefinitionId: item.returnReasonDefinitionId }),
            ...(item.returnReasonNote !== undefined && { returnReasonNote: item.returnReasonNote }),
            ...(item.returnReason !== undefined && { returnReason: item.returnReason })
        }));

        const variables = {
            returnInput: {
                orderId: input.orderId,
                returnLineItems: returnLineItems,
                ...(input.notifyCustomer !== undefined && { notifyCustomer: input.notifyCustomer })
            }
        };

        const query = `
            mutation ReturnCreate($returnInput: ReturnInput!) {
                returnCreate(returnInput: $returnInput) {
                    return {
                        id
                        name
                        status
                        totalQuantity
                    }
                    userErrors {
                        field
                        message
                        code
                    }
                }
            }
        `;

        // https://shopify.dev/docs/api/admin-graphql/2026-07/mutations/returnCreate
        const response = await nango.post({
            endpoint: 'admin/api/2026-07/graphql.json',
            data: {
                query: query,
                variables: variables
            },
            retries: 3
        });

        const ResponseSchema = z.object({
            data: z.object({
                returnCreate: z.object({
                    return: z
                        .object({
                            id: z.string(),
                            name: z.string(),
                            status: z.string(),
                            totalQuantity: z.number().optional()
                        })
                        .nullable(),
                    userErrors: z.array(
                        z.object({
                            field: z.array(z.string()),
                            message: z.string(),
                            code: z.string().optional()
                        })
                    )
                })
            })
        });

        const parsed = ResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Shopify API.',
                details: parsed.error.message
            });
        }

        const result = parsed.data.data.returnCreate;

        if (result.userErrors.length > 0) {
            return {
                userErrors: result.userErrors.map((error) => ({
                    field: error.field,
                    message: error.message,
                    ...(error.code !== undefined && { code: error.code })
                }))
            };
        }

        if (result.return === null) {
            return {
                userErrors: []
            };
        }

        return {
            return: {
                id: result.return.id,
                name: result.return.name,
                status: result.return.status,
                orderId: input.orderId,
                ...(result.return.totalQuantity !== undefined && {
                    totalQuantity: result.return.totalQuantity
                })
            },
            userErrors: []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
