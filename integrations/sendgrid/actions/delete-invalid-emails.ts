import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    emails: z.array(z.string().email()).optional().describe('Email addresses to remove from invalid-email suppressions. Example: ["test@example.com"]'),
    delete_all: z.boolean().optional().describe('If true, remove all invalid-email suppressions.')
});

const OutputSchema = z.object({
    deleted: z.boolean().optional(),
    emails_deleted: z.array(z.string()).optional()
});

const ProviderResponseSchema = z
    .object({
        emails: z.array(z.string()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Clear invalid-email suppressions for one or more addresses, or all of them.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.delete_all && (!input.emails || input.emails.length === 0)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide either emails or delete_all.'
            });
        }

        const response = await nango.delete({
            // https://www.twilio.com/docs/sendgrid/api-reference/suppressions-invalid-emails
            endpoint: '/v3/suppression/invalid_emails',
            data: input.delete_all ? { delete_all: true } : { emails: input.emails },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (parsed.success && parsed.data.emails) {
            return {
                deleted: true,
                emails_deleted: parsed.data.emails
            };
        }

        return { deleted: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
