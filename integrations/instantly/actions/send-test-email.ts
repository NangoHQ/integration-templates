import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    eaccount: z
        .string()
        .describe(
            'The email account that will be used to send this email. It has to be an email account connected to your workspace. Example: jondoe@example.com'
        ),
    to_address_email_list: z
        .string()
        .describe('Comma-separated list of recipients that will receive the test email. Example: recipient@example.com,recipient2@example.com'),
    subject: z.string().describe('Subject line of the test email. Example: Test email subject'),
    body: z.object({
        html: z.string().describe('HTML body of the test email. Example: <p>This is a test email</p>')
    })
});

const ProviderSuccessSchema = z.object({
    status: z.literal('success')
});

const ProviderErrorSchema = z.object({
    error: z.enum(['ACC_AUTH_ERROR', 'ACC_NOT_FOUND', 'ACC_UNKNOWN_ERROR'])
});

const OutputSchema = z.object({
    status: z.string()
});

const action = createAction({
    description: 'Send a test email.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/send-test-email' },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['emails:create'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/email/send-a-test-email
            endpoint: '/v2/emails/test',
            data: {
                eaccount: input.eaccount,
                to_address_email_list: input.to_address_email_list,
                subject: input.subject,
                body: {
                    html: input.body.html
                }
            },
            retries: 1
        });

        const successResult = ProviderSuccessSchema.safeParse(response.data);
        if (successResult.success) {
            return {
                status: successResult.data.status
            };
        }

        const errorResult = ProviderErrorSchema.safeParse(response.data);
        if (errorResult.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Failed to send test email: ${errorResult.data.error}`,
                error_code: errorResult.data.error
            });
        }

        throw new nango.ActionError({
            type: 'unexpected_response',
            message: 'Unexpected response from provider when sending test email.',
            response_data: response.data
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
