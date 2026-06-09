import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    payment_id: z.string().describe('Vendor payment ID to delete. Example: "260815000000116002"'),
    organization_id: z.string().describe('Organization ID. Example: "927270289"')
});

const ProviderDeleteResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Delete a vendor payment in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-vendor-payment',
        group: 'Vendor Payments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.vendorpayments.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.zoho.com/books/api/v3/vendor-payments/#delete-a-vendor-payment
            endpoint: `/books/v3/vendorpayments/${encodeURIComponent(input.payment_id)}`,
            params: {
                organization_id: input.organization_id
            },
            retries: 10
        });

        const providerResponse = ProviderDeleteResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code
            });
        }

        return {
            success: true,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
