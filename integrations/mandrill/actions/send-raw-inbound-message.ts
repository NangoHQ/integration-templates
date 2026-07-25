import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    raw_message: z.string().describe('The full MIME document of an email message. Example: "From: sender@example.com\\r\\nTo: recipient@example.com\\r\\n..."'),
    to: z
        .array(z.string())
        .optional()
        .describe('Optionally define the recipients to receive the message — otherwise the To, Cc, and Bcc headers in the document are used.'),
    mail_from: z.string().optional().describe('The address specified in the MAIL FROM stage of the SMTP conversation. Required for the SPF check.'),
    helo: z
        .string()
        .optional()
        .describe('The identification provided by the client MTA in the HELO stage of the SMTP conversation. Required for the SPF check.'),
    client_address: z.string().optional().describe("The remote MTA's IP address. Optional; required for the SPF check.")
});

const ProviderMatchSchema = z.object({
    email: z.string(),
    pattern: z.string(),
    url: z.string()
});

const OutputSchema = z.object({
    matches: z.array(ProviderMatchSchema)
});

const action = createAction({
    description: "Take a raw MIME document and pass it through Mandrill's inbound webhook pipeline as if it had arrived by email.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            raw_message: input.raw_message,
            ...(input.to !== undefined && { to: input.to }),
            ...(input.mail_from !== undefined && { mail_from: input.mail_from }),
            ...(input.helo !== undefined && { helo: input.helo }),
            ...(input.client_address !== undefined && { client_address: input.client_address })
        };

        // https://mailchimp.com/developer/transactional/api/inbound/send-raw/
        const response = await nango.post({
            endpoint: '/1.0/inbound/send-raw',
            data: requestBody,
            retries: 3
        });

        if (!response.data || !Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Unexpected response from Mandrill inbound/send-raw endpoint.'
            });
        }

        const parsedMatches = z.array(ProviderMatchSchema).parse(response.data);

        return {
            matches: parsedMatches
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
