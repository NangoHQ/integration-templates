import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    bookingId: z.string().min(1).describe('The unique identifier of the booking to delete. Example: "abc123"')
});

const OutputSchema = z.object({
    id: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Cancel/remove a booking.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://api.youcanbook.me/v1/bookings/{bookingId}
            endpoint: `/v1/bookings/${encodeURIComponent(input.bookingId)}`,
            retries: 1
        });

        return {
            id: input.bookingId,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
