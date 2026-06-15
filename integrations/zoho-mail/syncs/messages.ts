import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AccountSchema = z.object({
    accountId: z.string(),
    emailAddress: z.string().optional()
});

const FolderSchema = z.object({
    folderId: z.string(),
    folderName: z.string(),
    folderType: z.string().optional()
});

const ProviderMessageSchema = z.object({
    messageId: z.string(),
    subject: z.string().optional(),
    fromAddress: z.string().optional(),
    toAddress: z.string().optional(),
    receivedTime: z.string().optional(),
    folderId: z.string().optional(),
    threadId: z.string().optional(),
    hasAttachment: z.string().optional(),
    status: z.string().optional(),
    sender: z.string().optional(),
    size: z.string().optional(),
    summary: z.string().optional(),
    sentDateInGMT: z.string().optional()
});

const CheckpointSchema = z.object({
    received_after: z.string()
});

const MessageSchema = z.object({
    id: z.string(),
    messageId: z.string().optional(),
    subject: z.string().optional(),
    fromAddress: z.string().optional(),
    toAddress: z.string().optional(),
    receivedTime: z.string().optional(),
    folderId: z.string().optional(),
    threadId: z.string().optional(),
    hasAttachment: z.string().optional(),
    status: z.string().optional(),
    sender: z.string().optional(),
    size: z.string().optional(),
    summary: z.string().optional(),
    sentDateInGMT: z.string().optional()
});

const sync = createSync({
    description: 'Sync messages from Zoho Mail with incremental support by receivedTime',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Message: MessageSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/messages' }],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const receivedAfter = checkpoint?.['received_after'];

        const accounts = [];

        // @allowTryCatch: The connection may lack the ZohoMail.accounts scope,
        // so we fall back to the seed account ID when the accounts endpoint fails.
        try {
            // https://www.zoho.com/mail/help/api/get-all-users-accounts.html
            const accountsResponse = await nango.get({
                endpoint: '/api/accounts',
                retries: 3
            });

            const accountsData = Array.isArray(accountsResponse.data?.data) ? accountsResponse.data.data : [];
            for (const rawAccount of accountsData) {
                const parsed = AccountSchema.safeParse(rawAccount);
                if (!parsed.success) {
                    throw new Error('Failed to parse account');
                }
                accounts.push(parsed.data);
            }

            if (accounts.length === 0) {
                accounts.push({ accountId: '4845214000000008002' });
            }
        } catch (_error) {
            accounts.push({ accountId: '4845214000000008002' });
        }

        let maxReceivedTime = undefined;

        for (const account of accounts) {
            const accountId = account.accountId;

            // https://www.zoho.com/mail/help/api/get-all-folder-details.html
            const foldersResponse = await nango.get({
                endpoint: `/api/accounts/${encodeURIComponent(accountId)}/folders`,
                retries: 3
            });

            const foldersData = Array.isArray(foldersResponse.data?.data) ? foldersResponse.data.data : [];
            const folders = [];
            for (const rawFolder of foldersData) {
                const parsed = FolderSchema.safeParse(rawFolder);
                if (!parsed.success) {
                    throw new Error('Failed to parse folder');
                }
                folders.push(parsed.data);
            }

            const inboxFolder = folders.find((folder) => folder.folderName === 'Inbox') ?? folders.find((folder) => folder.folderType === 'Inbox');
            if (!inboxFolder) {
                continue;
            }

            const inboxFolderId = inboxFolder.folderId;

            const proxyConfig: ProxyConfiguration = {
                // https://www.zoho.com/mail/help/api/get-emails-list.html
                endpoint: `/api/accounts/${encodeURIComponent(accountId)}/messages/view`,
                params: {
                    folderId: inboxFolderId,
                    sortorder: 'false'
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'start',
                    offset_start_value: 1,
                    offset_calculation_method: 'by-response-size',
                    limit_name_in_request: 'limit',
                    limit: 200,
                    response_path: 'data'
                },
                retries: 3
            };

            for await (const messageBatch of nango.paginate(proxyConfig)) {
                if (!Array.isArray(messageBatch)) {
                    throw new Error('Expected message batch to be an array');
                }

                const messagesToSave = [];
                let shouldStop = false;

                for (const rawMessage of messageBatch) {
                    const parsed = ProviderMessageSchema.safeParse(rawMessage);
                    if (!parsed.success) {
                        throw new Error('Failed to parse message');
                    }

                    const message = parsed.data;

                    if (receivedAfter && message.receivedTime && message.receivedTime <= receivedAfter) {
                        shouldStop = true;
                        break;
                    }

                    if (message.receivedTime) {
                        if (!maxReceivedTime || message.receivedTime > maxReceivedTime) {
                            maxReceivedTime = message.receivedTime;
                        }
                    }

                    messagesToSave.push({
                        id: message.messageId,
                        messageId: message.messageId,
                        subject: message.subject,
                        fromAddress: message.fromAddress,
                        toAddress: message.toAddress,
                        receivedTime: message.receivedTime,
                        folderId: message.folderId,
                        threadId: message.threadId,
                        hasAttachment: message.hasAttachment,
                        status: message.status,
                        sender: message.sender,
                        size: message.size,
                        summary: message.summary,
                        sentDateInGMT: message.sentDateInGMT
                    });
                }

                if (messagesToSave.length > 0) {
                    await nango.batchSave(messagesToSave, 'Message');
                }

                if (shouldStop) {
                    break;
                }
            }
        }

        if (maxReceivedTime) {
            await nango.saveCheckpoint({ received_after: maxReceivedTime });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
