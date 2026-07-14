import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    capture_id: z.string().describe('The PayPal capture ID. Example: "2MU78835H4515710F"')
});

const MoneySchema = z.object({
    currency_code: z.string().optional(),
    value: z.string().optional()
});

const SellerProtectionSchema = z.object({
    status: z.string().optional(),
    dispute_categories: z.array(z.string()).optional()
});

const LinkSchema = z.object({
    href: z.string().optional(),
    rel: z.string().optional(),
    method: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string(),
        status: z.string(),
        amount: MoneySchema.optional(),
        final_capture: z.boolean().optional(),
        seller_protection: SellerProtectionSchema.optional(),
        seller_receivable_breakdown: z.record(z.string(), z.unknown()).optional(),
        links: z.array(LinkSchema).optional(),
        create_time: z.string().optional(),
        update_time: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a capture.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/payments/payment'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch We catch 404s from PayPal and convert them to a typed ActionError so callers get a clean not_found response instead of a raw HTTP exception.
        try {
            const response = await nango.get({
                // https://developer.paypal.com/api/payments/v2/#captures_get
                endpoint: `/v2/payments/captures/${encodeURIComponent(input.capture_id)}`,
                retries: 3
            });

            const capture = OutputSchema.parse(response.data);

            return capture;
        } catch (err: unknown) {
            const status =
                err !== null &&
                typeof err === 'object' &&
                'response' in err &&
                err.response !== null &&
                typeof err.response === 'object' &&
                'status' in err.response &&
                typeof err.response.status === 'number'
                    ? err.response.status
                    : undefined;

            if (status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Capture not found',
                    capture_id: input.capture_id
                });
            }

            throw err;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
