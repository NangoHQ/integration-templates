import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        bookingUid: z.string().describe('Unique identifier of the booking to delete. Example: "abc123def456".')
    })
    .describe('Input for deleting a booking in Cal.com.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes or archives the booking on the provider via a DELETE request.
 * @pitfalls: Cal.com API v2 does not implement a DELETE endpoint for bookings, so every invocation returns a 404 Not Found error.
 */
const action = createAction({
    description: 'Delete or archive a booking in Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: z.void(),
    scopes: ['BOOKING_WRITE'],

    exec: async (nango, input): Promise<void> => {
        await nango.delete({
            // https://cal.com/docs/api-reference/v2/bookings/delete-a-booking
            endpoint: `/bookings/${encodeURIComponent(input.bookingUid)}`,
            retries: 3
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
