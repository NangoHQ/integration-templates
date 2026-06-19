import { z } from 'zod';
import { createAction } from 'nango';

// No input needed for listing send-as aliases
const InputSchema = z.object({});

// Provider schema based on Gmail API SendAs resource
// https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs#SendAs
const ProviderSendAsSchema = z.object({
    displayName: z.string().optional(),
    isDefault: z.boolean().optional(),
    isPrimary: z.boolean().optional(),
    replyToAddress: z.string().optional(),
    sendAsEmail: z.string().optional(),
    signature: z.string().optional(),
    treatAsAlias: z.boolean().optional(),
    verificationStatus: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    sendAs: z.array(ProviderSendAsSchema).optional()
});

// Output schema - using camelCase to match Gmail API majority casing
const SendAsAliasSchema = z.object({
    displayName: z.string().optional(),
    isDefault: z.boolean().optional(),
    isPrimary: z.boolean().optional(),
    replyToAddress: z.string().optional(),
    sendAsEmail: z.string().optional(),
    signature: z.string().optional(),
    treatAsAlias: z.boolean().optional(),
    verificationStatus: z.string().optional()
});

const OutputSchema = z.object({
    sendAsAliases: z.array(SendAsAliasSchema)
});

const action = createAction({
    description: 'List send-as aliases available for the mailbox.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.settings.basic'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs/list
        const response = await nango.get({
            endpoint: '/gmail/v1/users/me/settings/sendAs',
            retries: 3
        });

        const parsed = ProviderListResponseSchema.parse(response.data);

        const sendAsAliases =
            parsed.sendAs?.map((alias) => ({
                ...(alias.displayName !== undefined && {
                    displayName: alias.displayName
                }),
                ...(alias.isDefault !== undefined && { isDefault: alias.isDefault }),
                ...(alias.isPrimary !== undefined && { isPrimary: alias.isPrimary }),
                ...(alias.replyToAddress !== undefined && {
                    replyToAddress: alias.replyToAddress
                }),
                ...(alias.sendAsEmail !== undefined && { sendAsEmail: alias.sendAsEmail }),
                ...(alias.signature !== undefined && { signature: alias.signature }),
                ...(alias.treatAsAlias !== undefined && { treatAsAlias: alias.treatAsAlias }),
                ...(alias.verificationStatus !== undefined && {
                    verificationStatus: alias.verificationStatus
                })
            })) ?? [];

        return { sendAsAliases };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
