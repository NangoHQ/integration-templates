import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    raw_message: z
        .string()
        .describe('The full MIME document of an email message. Example: "From: sender@example.com\\nTo: recipient@example.com\\nSubject: Test\\n\\nBody"'),
    from_email: z.string().optional().describe('The email address of the sender.'),
    from_name: z.string().optional().describe('The display name of the sender.'),
    to: z.array(z.string()).optional().describe('An array of recipient email addresses.'),
    async: z.boolean().optional().describe('Enable asynchronous sending. Defaults to false.'),
    ip_pool: z.string().optional().describe('The name of the dedicated IP pool to use.'),
    send_at: z.string().optional().describe('When to send the message (YYYY-MM-DD HH:MM:SS).'),
    return_path_domain: z.string().optional().describe("A custom domain to use for the message's return-path.")
});

const ProviderRecipientSchema = z.object({
    email: z.string(),
    status: z.string(),
    _id: z.string(),
    reject_reason: z.string().nullable().optional()
});

const OutputSchema = z.object({
    results: z.array(
        z.object({
            email: z.string(),
            status: z.string(),
            id: z.string(),
            reject_reason: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'Send a raw MIME document as a transactional message.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://mailchimp.com/developer/transactional/api/messages/send-raw-message/
            endpoint: '/1.0/messages/send-raw.json',
            data: {
                raw_message: input.raw_message,
                ...(input.from_email !== undefined && { from_email: input.from_email }),
                ...(input.from_name !== undefined && { from_name: input.from_name }),
                ...(input.to !== undefined && { to: input.to }),
                ...(input.async !== undefined && { async: input.async }),
                ...(input.ip_pool !== undefined && { ip_pool: input.ip_pool }),
                ...(input.send_at !== undefined && { send_at: input.send_at }),
                ...(input.return_path_domain !== undefined && { return_path_domain: input.return_path_domain })
            },
            retries: 3
        };

        const response = await nango.post(config);

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array response from the provider.',
                response: response.data
            });
        }

        const providerResults = response.data.map((item: unknown) => {
            const parsed = ProviderRecipientSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response_item',
                    message: 'Failed to parse a recipient result from the provider.',
                    error: parsed.error.message
                });
            }
            return parsed.data;
        });

        return {
            results: providerResults.map((result) => ({
                email: result.email,
                status: result.status,
                id: result._id,
                ...(result.reject_reason != null && { reject_reason: result.reject_reason })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
