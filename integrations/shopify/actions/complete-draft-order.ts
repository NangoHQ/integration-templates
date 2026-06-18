import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    draftOrderId: z.string().describe('The ID of the draft order to complete. Example: "gid://shopify/DraftOrder/1234567890"'),
    paymentPending: z.boolean().optional().describe('Whether the order should be created with payment pending.')
});

const ProviderDraftOrderSchema = z.object({
    id: z.string().optional(),
    order: z
        .object({
            id: z.string().optional()
        })
        .optional()
});

const ProviderErrorSchema = z.object({
    message: z.string(),
    field: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            draftOrderComplete: z
                .object({
                    draftOrder: ProviderDraftOrderSchema.nullable().optional(),
                    userErrors: z.array(ProviderErrorSchema).optional()
                })
                .optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                path: z.array(z.string().or(z.number())).optional(),
                extensions: z
                    .object({
                        code: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    draftOrderId: z.string().optional(),
    orderId: z.string().optional()
});

const action = createAction({
    description: 'Complete a Shopify draft order and convert it into an order.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_draft_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-01/mutations/draftOrderComplete
            endpoint: '/admin/api/2026-01/graphql.json',
            data: {
                query: `
                    mutation draftOrderComplete($id: ID!, $paymentPending: Boolean) {
                        draftOrderComplete(id: $id, paymentPending: $paymentPending) {
                            draftOrder {
                                id
                                order {
                                    id
                                }
                            }
                            userErrors {
                                message
                                field
                            }
                        }
                    }
                `,
                variables: {
                    id: input.draftOrderId,
                    paymentPending: input.paymentPending ?? false
                }
            },
            retries: 1
        });

        const payload = ProviderResponseSchema.parse(response.data);

        if (payload.errors && payload.errors.length > 0) {
            const error = payload.errors[0];
            if (error) {
                const isAccessDeniedOnDraftOrder =
                    error.extensions?.code === 'ACCESS_DENIED' && error.path && error.path.length >= 2 && error.path[error.path.length - 1] === 'draftOrder';

                if (!isAccessDeniedOnDraftOrder) {
                    throw new nango.ActionError({
                        type: 'provider_error',
                        message: error.message
                    });
                }
            }
        }

        const result = payload.data?.draftOrderComplete;
        if (!result) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Shopify.'
            });
        }

        if (result.userErrors && result.userErrors.length > 0) {
            const error = result.userErrors[0];
            if (error) {
                throw new nango.ActionError({
                    type: 'completion_failed',
                    message: error.message,
                    field: error.field
                });
            }
        }

        const draftOrder = result.draftOrder;
        if (draftOrder && draftOrder.id) {
            return {
                draftOrderId: draftOrder.id,
                ...(draftOrder.order?.id && { orderId: draftOrder.order.id })
            };
        }

        return {
            draftOrderId: input.draftOrderId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
