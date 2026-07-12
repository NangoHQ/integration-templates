import { z } from 'zod';
import { createAction } from 'nango';

const EmailSchema = z.object({
    subject: z.string().nullable().optional().describe('Email subject line. Example: "Please authorize your direct debit mandate"'),
    body: z.string().nullable().optional().describe('Email body content. Example: "Please click the link to authorize your direct debit mandate."'),
    recipients: z.array(z.string().email()).describe('Email recipient addresses. Example: ["customer@example.com"]')
});

const InputSchema = z.object({
    customer_id: z.number().int().describe('Customer identifier. Example: 42'),
    email: EmailSchema
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Send a GoCardless mandate email request',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_mandates:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://pennylane.readme.io/reference/postgocardlessmandatemailrequests
        await nango.post({
            endpoint: '/api/external/v2/gocardless_mandates/mail_requests',
            data: {
                customer_id: input.customer_id,
                email: {
                    recipients: input.email.recipients,
                    ...(input.email.subject !== undefined && { subject: input.email.subject }),
                    ...(input.email.body !== undefined && { body: input.email.body })
                }
            },
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
