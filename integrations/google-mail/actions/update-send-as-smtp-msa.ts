import { z } from 'zod';
import { createAction } from 'nango';

const SmtpMsaInputSchema = z.object({
    host: z.string().describe('The hostname of the SMTP service. Required.'),
    port: z.number().describe('The port of the SMTP service. Required.'),
    username: z.string().optional().describe('The username for authentication with the SMTP service. This is a write-only field.'),
    password: z.string().optional().describe('The password for authentication with the SMTP service. This is a write-only field.'),
    securityMode: z
        .enum(['securityModeUnspecified', 'none', 'ssl', 'starttls'])
        .describe('The protocol used to secure communication with the SMTP service. Required.')
});

const InputSchema = z.object({
    sendAsEmail: z.string().describe('The send-as alias email to be updated. Example: "alias@example.com"'),
    userId: z.string().optional().describe('User\'s email address. The special value "me" can be used to indicate the authenticated user. Defaults to "me".'),
    smtpMsa: SmtpMsaInputSchema.describe('The SMTP MSA settings for the send-as alias.')
});

const SmtpMsaOutputSchema = z.object({
    host: z.string(),
    port: z.number(),
    securityMode: z.enum(['securityModeUnspecified', 'none', 'ssl', 'starttls'])
});

const SendAsOutputSchema = z.object({
    sendAsEmail: z.string(),
    displayName: z.string().optional(),
    replyToAddress: z.string().optional(),
    signature: z.string().optional(),
    isPrimary: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    treatAsAlias: z.boolean().optional(),
    smtpMsa: SmtpMsaOutputSchema.optional(),
    verificationStatus: z.enum(['verificationStatusUnspecified', 'accepted', 'pending']).optional()
});

const OutputSchema = z.object({
    sendAs: SendAsOutputSchema
});

const action = createAction({
    description: 'Update the SMTP MSA settings for a send-as alias.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-send-as-smtp-msa',
        group: 'SendAs'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.settings.basic'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const userId = input.userId || 'me';
        const encodedSendAsEmail = encodeURIComponent(input.sendAsEmail);

        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs/patch
        const response = await nango.patch({
            endpoint: `/gmail/v1/users/${userId}/settings/sendAs/${encodedSendAsEmail}`,
            data: {
                smtpMsa: {
                    host: input.smtpMsa.host,
                    port: input.smtpMsa.port,
                    securityMode: input.smtpMsa.securityMode,
                    ...(input.smtpMsa.username !== undefined && { username: input.smtpMsa.username }),
                    ...(input.smtpMsa.password !== undefined && { password: input.smtpMsa.password })
                }
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Send-as alias not found or could not be updated',
                sendAsEmail: input.sendAsEmail
            });
        }

        const providerSendAs = SendAsOutputSchema.parse(response.data);

        return {
            sendAs: providerSendAs
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
