import { createSync } from 'nango';
import { z } from 'zod';

const ProviderFolderSchema = z.object({
    folderId: z.string(),
    folderName: z.string(),
    folderType: z.string(),
    path: z.string(),
    isArchived: z.number().optional(),
    imapAccess: z.boolean().optional(),
    previousFolderId: z.string().optional(),
    URI: z.string().optional(),
    VW: z.boolean().optional(),
    HIDE: z.boolean().optional(),
    folderIcon: z.string().optional()
});

const FolderSchema = z.object({
    id: z.string(),
    folderId: z.string(),
    accountId: z.string(),
    folderName: z.string(),
    folderType: z.string(),
    path: z.string(),
    isArchived: z.number().optional(),
    imapAccess: z.boolean().optional(),
    previousFolderId: z.string().optional(),
    URI: z.string().optional()
});

const AccountSchema = z.object({
    accountId: z.string()
});

const AccountsResponseSchema = z.object({
    data: z.array(z.unknown())
});

const FoldersResponseSchema = z.object({
    data: z.array(z.unknown())
});

const CheckpointSchema = z.object({
    next_account_index: z.number().int().nonnegative(),
    next_account_id: z.string(),
    accounts_fingerprint: z.string()
});

function isInvalidOAuthScopeResponse(data: unknown): boolean {
    if (Array.isArray(data) && data.length > 1 && typeof data[1] === 'object' && data[1] !== null) {
        const details = data[1];
        if ('errorCode' in details && typeof details['errorCode'] === 'string') {
            return details['errorCode'] === 'INVALID_OAUTHSCOPE';
        }
    }
    if (typeof data === 'object' && data !== null && 'errorCode' in data && typeof data['errorCode'] === 'string') {
        return data['errorCode'] === 'INVALID_OAUTHSCOPE';
    }
    return false;
}

const sync = createSync({
    description: 'Sync all folders for each account from Zoho Mail',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Folder: FolderSchema
    },
    endpoints: [
        {
            path: '/syncs/folders',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        let accountIds: string[] = [];

        // https://www.zoho.com/mail/help/api/get-all-users-accounts.html
        const accountsResponse = await nango.get({
            endpoint: '/api/accounts',
            retries: 3
        });

        if (isInvalidOAuthScopeResponse(accountsResponse.data)) {
            // Connection lacks ZohoMail.accounts scope — fall back to accountId stored in connection_config.
            const connection = await nango.getConnection();
            const fallbackAccountId = connection.connection_config?.['accountId'];
            if (typeof fallbackAccountId !== 'string' || !fallbackAccountId) {
                throw new Error('Connection missing ZohoMail.accounts scope and no accountId in connection_config — cannot enumerate accounts for folder sync');
            }
            accountIds = [fallbackAccountId];
        } else {
            const accountsParsed = AccountsResponseSchema.safeParse(accountsResponse.data);
            if (!accountsParsed.success) {
                throw new Error('Failed to parse accounts response: ' + accountsParsed.error.message);
            }

            for (const account of accountsParsed.data.data) {
                const accountParsed = AccountSchema.safeParse(account);
                if (!accountParsed.success) {
                    throw new Error('Failed to parse account record: ' + accountParsed.error.message);
                }
                accountIds.push(accountParsed.data.accountId);
            }
        }

        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const accountsFingerprint = JSON.stringify(accountIds);
        let startAccountIndex = 0;
        if (checkpoint.success && checkpoint.data.accounts_fingerprint === accountsFingerprint) {
            if (checkpoint.data.next_account_id !== '') {
                const resolvedIndex = accountIds.indexOf(checkpoint.data.next_account_id);
                startAccountIndex = resolvedIndex >= 0 ? resolvedIndex : 0;
            } else if (checkpoint.data.next_account_index < accountIds.length) {
                startAccountIndex = checkpoint.data.next_account_index;
            }
        }

        await nango.trackDeletesStart('Folder');

        for (let accountIndex = startAccountIndex; accountIndex < accountIds.length; accountIndex++) {
            const accountId = accountIds[accountIndex];
            if (!accountId) {
                throw new Error(`Missing account ID at index ${accountIndex}`);
            }
            // https://www.zoho.com/mail/help/api/get-all-folder-details.html
            const foldersResponse = await nango.get({
                endpoint: `/api/accounts/${encodeURIComponent(accountId)}/folders`,
                retries: 3
            });

            const foldersParsed = FoldersResponseSchema.safeParse(foldersResponse.data);
            if (!foldersParsed.success) {
                throw new Error('Failed to parse folders response: ' + foldersParsed.error.message);
            }

            const folders: Array<z.infer<typeof FolderSchema>> = [];
            for (const folder of foldersParsed.data.data) {
                const folderParsed = ProviderFolderSchema.safeParse(folder);
                if (!folderParsed.success) {
                    throw new Error('Failed to parse folder record: ' + folderParsed.error.message);
                }

                const folderData = folderParsed.data;
                folders.push({
                    id: `${accountId}-${folderData.folderId}`,
                    folderId: folderData.folderId,
                    accountId: accountId,
                    folderName: folderData.folderName,
                    folderType: folderData.folderType,
                    path: folderData.path,
                    ...(folderData.isArchived !== undefined && { isArchived: folderData.isArchived }),
                    ...(folderData.imapAccess !== undefined && { imapAccess: folderData.imapAccess }),
                    ...(folderData.previousFolderId !== undefined && { previousFolderId: folderData.previousFolderId }),
                    ...(folderData.URI !== undefined && { URI: folderData.URI })
                });
            }

            if (folders.length > 0) {
                await nango.batchSave(folders, 'Folder');
            }

            const nextAccountIndex = accountIndex + 1;
            if (nextAccountIndex < accountIds.length) {
                await nango.saveCheckpoint({
                    next_account_index: nextAccountIndex,
                    next_account_id: accountIds[nextAccountIndex]!,
                    accounts_fingerprint: accountsFingerprint
                });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Folder');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
