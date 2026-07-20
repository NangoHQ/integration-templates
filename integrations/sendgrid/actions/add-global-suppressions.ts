import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    recipient_emails: z.array(z.string().email()).describe('Array of email addresses to add to the global suppression list. Example: ["a@x.com", "b@x.com"]')
});

const OutputSchema = z.object({
    recipient_emails: z.array(z.string().email()).describe('The email addresses that were added to the global suppression list')
});

const action = createAction({
    description: 'Add email addresses to the global suppression (unsubscribe) list',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['asm.suppressions.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.sendgrid.com/api-reference/suppressions-global-suppressions/add-recipient-addresses-to-the-global-suppression-group
            endpoint: '/v3/asm/suppressions/global',
            data: {
                recipient_emails: input.recipient_emails
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);

        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
