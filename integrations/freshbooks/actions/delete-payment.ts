import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string().describe('FreshBooks account ID. Example: "ZyQ04o"')
});

const InputSchema = z.object({
    id: z.string().describe('Payment ID to archive. Example: "312041"')
});

const ProviderPaymentSchema = z.object({
    id: z.union([z.number(), z.string()]),
    vis_state: z.number().optional()
});

const FreshBooksResponseSchema = z.object({
    response: z.object({
        result: z.object({
            payment: ProviderPaymentSchema
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    vis_state: z.number().optional()
});

const action = createAction({
    description: 'Archive (soft-delete) a payment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:payments:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();

        if (!metadata || typeof metadata !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Connection metadata is missing.'
            });
        }

        const accountId = 'accountId' in metadata ? metadata.accountId : undefined;

        if (!accountId || typeof accountId !== 'string') {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const response = await nango.put({
            // https://www.freshbooks.com/api/payments
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/payments/payments/${encodeURIComponent(input.id)}`,
            data: {
                payment: {
                    vis_state: 1
                }
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from FreshBooks API.'
            });
        }

        const parsed = FreshBooksResponseSchema.parse(response.data);
        const providerPayment = parsed.response.result.payment;

        return {
            id: String(providerPayment.id),
            ...(providerPayment.vis_state !== undefined && { vis_state: providerPayment.vis_state })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
