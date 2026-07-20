import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sender_id: z.string().describe('Sender identity ID. Example: "9389987"')
});

const OutputSchema = z.object({
    success: z.literal(true)
});

const action = createAction({
    description: 'Delete a sender identity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://www.twilio.com/docs/sendgrid/api-reference/sender-verification/delete-sender
            endpoint: `/v3/verified_senders/${encodeURIComponent(input.sender_id)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
