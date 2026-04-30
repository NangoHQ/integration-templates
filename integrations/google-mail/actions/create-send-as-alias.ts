import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sendAsEmail: z.string().email().describe('The email address to appear in the "From:" header for mail sent using this alias. Example: "alias@example.com"'),
    displayName: z.string().optional().describe('A name that appears in the "From:" header for mail sent using this alias. Example: "John Doe"'),
    replyToAddress: z.string().email().optional().describe('An optional email address to use for the reply-to header. Example: "replies@example.com"'),
    signature: z.string().optional().describe('An optional HTML signature for the alias'),
    isDefault: z.boolean().optional().describe('Whether this alias is the default for the user'),
    treatAsAlias: z.boolean().optional().describe("Whether Gmail should treat this address as an alias of the user's primary email address")
});

const ProviderSendAsSchema = z.object({
    sendAsEmail: z.string(),
    displayName: z.string().optional(),
    replyToAddress: z.string().optional(),
    signature: z.string().optional(),
    isDefault: z.boolean().optional(),
    isPrimary: z.boolean().optional(),
    treatAsAlias: z.boolean().optional(),
    verificationStatus: z.string().optional()
});

const OutputSchema = z.object({
    sendAsEmail: z.string(),
    displayName: z.string().optional(),
    replyToAddress: z.string().optional(),
    signature: z.string().optional(),
    isDefault: z.boolean().optional(),
    isPrimary: z.boolean().optional(),
    treatAsAlias: z.boolean().optional(),
    verificationStatus: z.string().optional()
});

const action = createAction({
    description: 'Create a custom send-as alias for the mailbox',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-send-as-alias',
        group: 'Settings'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.settings.basic'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const userId = 'me';

        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs/create
        const response = await nango.post({
            endpoint: `/gmail/v1/users/${encodeURIComponent(userId)}/settings/sendAs`,
            data: {
                sendAsEmail: input.sendAsEmail,
                ...(input.displayName !== undefined && { displayName: input.displayName }),
                ...(input.replyToAddress !== undefined && { replyToAddress: input.replyToAddress }),
                ...(input.signature !== undefined && { signature: input.signature }),
                ...(input.isDefault === true && { isDefault: true }),
                ...(input.treatAsAlias !== undefined && { treatAsAlias: input.treatAsAlias })
            },
            retries: 1
        });

        const providerSendAs = ProviderSendAsSchema.parse(response.data);

        return {
            sendAsEmail: providerSendAs.sendAsEmail,
            ...(providerSendAs.displayName !== undefined && { displayName: providerSendAs.displayName }),
            ...(providerSendAs.replyToAddress !== undefined && { replyToAddress: providerSendAs.replyToAddress }),
            ...(providerSendAs.signature !== undefined && { signature: providerSendAs.signature }),
            ...(providerSendAs.isDefault !== undefined && { isDefault: providerSendAs.isDefault }),
            ...(providerSendAs.isPrimary !== undefined && { isPrimary: providerSendAs.isPrimary }),
            ...(providerSendAs.treatAsAlias !== undefined && { treatAsAlias: providerSendAs.treatAsAlias }),
            ...(providerSendAs.verificationStatus !== undefined && { verificationStatus: providerSendAs.verificationStatus })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
