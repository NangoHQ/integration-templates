import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fulfillmentId: z.string().describe('The ID of the fulfillment. Example: "gid://shopify/Fulfillment/255858046"'),
    trackingCompany: z.string().optional().describe('The name of the tracking company. Example: "UPS"'),
    trackingNumber: z.string().optional().describe('The tracking number. Example: "1Z001985YW99744790"'),
    trackingUrl: z.string().optional().describe('The tracking URL. Example: "https://www.ups.com/track?tracknum=1Z001985YW99744790"'),
    notifyCustomer: z.boolean().optional().describe('Whether the customer will be notified of this update and future updates for the fulfillment.')
});

const ProviderUserErrorSchema = z.object({
    field: z.array(z.string()).nullable().optional(),
    message: z.string()
});

const ProviderPayloadSchema = z.object({
    data: z.object({
        fulfillmentTrackingInfoUpdate: z
            .object({
                userErrors: z.array(ProviderUserErrorSchema)
            })
            .nullable()
            .optional()
    }),
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    trackingInfo: z
        .array(
            z.object({
                company: z.string().optional(),
                number: z.string().optional(),
                url: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Update tracking details on a Shopify fulfillment.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-fulfillment-tracking',
        group: 'Fulfillments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_assigned_fulfillment_orders', 'write_merchant_managed_fulfillment_orders', 'write_third_party_fulfillment_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const trackingInfoInput: {
            company?: string;
            number?: string;
            url?: string;
        } = {};

        if (input.trackingCompany !== undefined) {
            trackingInfoInput.company = input.trackingCompany;
        }
        if (input.trackingNumber !== undefined) {
            trackingInfoInput.number = input.trackingNumber;
        }
        if (input.trackingUrl !== undefined) {
            trackingInfoInput.url = input.trackingUrl;
        }

        const variables: {
            fulfillmentId: string;
            trackingInfoInput: typeof trackingInfoInput;
            notifyCustomer?: boolean;
        } = {
            fulfillmentId: input.fulfillmentId,
            trackingInfoInput
        };

        if (input.notifyCustomer !== undefined) {
            variables.notifyCustomer = input.notifyCustomer;
        }

        // https://shopify.dev/docs/api/admin-graphql/2025-04/mutations/fulfillmentTrackingInfoUpdate
        const response = await nango.post({
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query: `
                    mutation FulfillmentTrackingInfoUpdate($fulfillmentId: ID!, $trackingInfoInput: FulfillmentTrackingInput!, $notifyCustomer: Boolean) {
                        fulfillmentTrackingInfoUpdate(
                            fulfillmentId: $fulfillmentId,
                            trackingInfoInput: $trackingInfoInput,
                            notifyCustomer: $notifyCustomer
                        ) {
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                variables
            },
            retries: 3
        });

        const payload = ProviderPayloadSchema.parse(response.data);

        const mutationResult = payload.data?.fulfillmentTrackingInfoUpdate;

        if (payload.errors && payload.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'Shopify GraphQL returned errors.',
                errors: payload.errors
            });
        }

        const userErrors = mutationResult?.userErrors;
        if (userErrors && userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'user_error',
                message: userErrors.map((err) => err.message).join(', '),
                userErrors
            });
        }

        return {
            id: input.fulfillmentId,
            trackingInfo: [
                {
                    ...(input.trackingCompany !== undefined && { company: input.trackingCompany }),
                    ...(input.trackingNumber !== undefined && { number: input.trackingNumber }),
                    ...(input.trackingUrl !== undefined && { url: input.trackingUrl })
                }
            ]
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
