import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique ID of the coupon code to delete. Example: "nango_seed_coupon_1-NANGOSEED1"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.string()
});

const action = createAction({
    description: 'Delete a coupon code.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['coupon-codes:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.klaviyo.com/en/reference/delete_coupon_code
        await nango.delete({
            endpoint: `/api/coupon-codes/${encodeURIComponent(input.id)}`,
            headers: {
                revision: '2026-04-15'
            },
            retries: 10
        });

        return {
            success: true,
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
