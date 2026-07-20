import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    group_id: z.number().describe('The ID of the suppression group. Example: 254514'),
    email: z.string().email().describe('The email address to remove from the suppression group. Example: user@example.com')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: "Remove a single email address's unsubscribe from a specific group.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://www.twilio.com/docs/sendgrid/api-reference/suppressions-delete-a-suppression-from-a-suppression-group
            endpoint: `/v3/asm/groups/${encodeURIComponent(input.group_id)}/suppressions/${encodeURIComponent(input.email)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
