import { createSync } from 'nango';
import { z } from 'zod';

// Gmail API SendAs resource
// https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs#SendAs

const SmtpMsaSchema = z.object({
    host: z.string().optional(),
    port: z.number().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    securityMode: z.string().optional()
});

const SendAsAliasSchema = z.object({
    id: z.string(),
    sendAsEmail: z.string(),
    displayName: z.string().optional(),
    replyToAddress: z.string().optional(),
    signature: z.string().optional(),
    isPrimary: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    verificationStatus: z.string().optional(),
    treatAsAlias: z.boolean().optional(),
    smtpMsa: SmtpMsaSchema.optional()
});

const ProviderResponseSchema = z.object({
    sendAs: z.array(z.unknown()).optional()
});

const SendAsItemSchema = z.object({
    sendAsEmail: z.string(),
    displayName: z.string().optional(),
    replyToAddress: z.string().optional(),
    signature: z.string().optional(),
    isPrimary: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    verificationStatus: z.string().optional(),
    treatAsAlias: z.boolean().optional(),
    smtpMsa: z
        .object({
            host: z.string().optional(),
            port: z.number().optional(),
            username: z.string().optional(),
            password: z.string().optional(),
            securityMode: z.string().optional()
        })
        .optional()
});

const sync = createSync({
    description: 'Sync configured Gmail send-as aliases and alias settings',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/send-as-aliases'
        }
    ],
    models: {
        SendAsAlias: SendAsAliasSchema
    },

    exec: async (nango) => {
        // Blocker: The Gmail send-as aliases list endpoint does not support
        // incremental filtering (no updated_at, modified_since, or cursor parameters).
        // It returns the full list of send-as aliases for the user.
        // Therefore, we use full refresh with trackDeletesStart/trackDeletesEnd.
        await nango.trackDeletesStart('SendAsAlias');

        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs/list
        const response = await nango.get({
            endpoint: '/gmail/v1/users/me/settings/sendAs',
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Invalid response from Gmail API: ${parsed.error.message}`);
        }

        const sendAsList = parsed.data.sendAs ?? [];
        const aliases: z.infer<typeof SendAsAliasSchema>[] = [];

        for (const item of sendAsList) {
            const parsedItem = SendAsItemSchema.safeParse(item);
            if (!parsedItem.success) {
                continue;
            }
            const raw = parsedItem.data;

            const alias: z.infer<typeof SendAsAliasSchema> = {
                id: raw.sendAsEmail,
                sendAsEmail: raw.sendAsEmail,
                ...(raw.displayName !== undefined && { displayName: raw.displayName }),
                ...(raw.replyToAddress !== undefined && { replyToAddress: raw.replyToAddress }),
                ...(raw.signature !== undefined && { signature: raw.signature }),
                ...(raw.isPrimary !== undefined && { isPrimary: raw.isPrimary }),
                ...(raw.isDefault !== undefined && { isDefault: raw.isDefault }),
                ...(raw.verificationStatus !== undefined && { verificationStatus: raw.verificationStatus }),
                ...(raw.treatAsAlias !== undefined && { treatAsAlias: raw.treatAsAlias }),
                ...(raw.smtpMsa !== undefined && {
                    smtpMsa: {
                        ...(raw.smtpMsa.host !== undefined && { host: raw.smtpMsa.host }),
                        ...(raw.smtpMsa.port !== undefined && { port: raw.smtpMsa.port }),
                        ...(raw.smtpMsa.username !== undefined && { username: raw.smtpMsa.username }),
                        ...(raw.smtpMsa.password !== undefined && { password: raw.smtpMsa.password }),
                        ...(raw.smtpMsa.securityMode !== undefined && { securityMode: raw.smtpMsa.securityMode })
                    }
                })
            };

            aliases.push(alias);
        }

        if (aliases.length > 0) {
            await nango.batchSave(aliases, 'SendAsAlias');
        }

        await nango.trackDeletesEnd('SendAsAlias');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
