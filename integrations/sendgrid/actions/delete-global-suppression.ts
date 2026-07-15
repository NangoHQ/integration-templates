import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('Email address to remove from the global suppression list. Example: "user@example.com"')
});

const OutputSchema = z.object({
    email: z.string()
});

const action = createAction({
    description: 'Remove a single email address from the global suppression list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['mail.settings.read', 'mail.settings.update'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.twilio.com/docs/sendgrid/api-reference/suppressions-global-suppressions/delete-a-globally-suppressed-email-address
        await nango.delete({
            endpoint: `/v3/asm/suppressions/global/${encodeURIComponent(input.email)}`,
            retries: 3
        });

        return {
            email: input.email
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
