import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    group_id: z.number().describe('The ID of the unsubscribe group. Example: 254515'),
    recipient_emails: z.array(z.string().email()).describe('Email addresses to add to the group suppressions. Example: ["user@example.com"]')
});

const OutputSchema = z.object({
    recipient_emails: z.array(z.string()).describe('The email addresses added to the unsubscribe group.')
});

const ProviderResponseSchema = z.object({
    recipient_emails: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Unsubscribe email addresses from a specific group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['asm.suppressions.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.twilio.com/docs/sendgrid/api-reference/suppressions-suppressions/add-suppressions-to-a-suppression-group
            endpoint: `/v3/asm/groups/${encodeURIComponent(String(input.group_id))}/suppressions`,
            data: {
                recipient_emails: input.recipient_emails
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            recipient_emails: providerResponse.recipient_emails ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
