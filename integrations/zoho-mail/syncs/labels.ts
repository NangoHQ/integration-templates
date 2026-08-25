import { createSync } from 'nango';
import { z } from 'zod';

const LabelSchema = z.object({
    id: z.string(),
    accountId: z.string(),
    labelId: z.string(),
    displayName: z.string().optional(),
    color: z.string().optional(),
    sequence: z.number().optional(),
    tagId: z.string().optional(),
    uri: z.string().optional()
});

const AccountItemSchema = z.object({
    accountId: z.string()
});

const AccountsResponseSchema = z.object({
    data: z.array(z.unknown())
});

const LabelItemSchema = z.object({
    labelId: z.string(),
    displayName: z.string().optional(),
    color: z.string().optional(),
    sequence: z.number().optional(),
    tagId: z.string().optional(),
    URI: z.string().optional()
});

const LabelsResponseSchema = z.object({
    data: z.array(z.unknown())
});

const CheckpointSchema = z.object({
    accountIndex: z.number().int().nonnegative(),
    accountId: z.string(),
    accountsFingerprint: z.string()
});

const sync = createSync({
    description: 'Sync all labels for each account from Zoho Mail',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/labels',
            method: 'GET'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        Label: LabelSchema
    },

    exec: async (nango) => {
        // Blocker: /api/accounts/{accountId}/labels returns all labels in a single
        // response with no changed-since filter, no deleted-record endpoint, and no
        // resumable cursor. We checkpoint progress through the accounts outer loop.
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointParse = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = checkpointParse.success ? checkpointParse.data : undefined;

        // https://www.zoho.com/mail/help/api/get-all-users-accounts.html
        const accountsResponse = await nango.get({
            endpoint: '/api/accounts',
            retries: 3
        });

        const parsedAccountsResponse = AccountsResponseSchema.safeParse(accountsResponse.data);
        if (!parsedAccountsResponse.success) {
            throw new Error(`Failed to parse accounts response: ${parsedAccountsResponse.error.message}`);
        }

        const accounts = parsedAccountsResponse.data.data.map((item) => {
            const parsedAccount = AccountItemSchema.safeParse(item);
            if (!parsedAccount.success) {
                throw new Error(`Failed to parse account item: ${parsedAccount.error.message}`);
            }
            return parsedAccount.data;
        });

        await nango.trackDeletesStart('Label');

        const accountIds = accounts.map(({ accountId }) => accountId);
        const accountsFingerprint = JSON.stringify(accountIds);
        let startIndex = 0;
        if (checkpoint && checkpoint.accountsFingerprint === accountsFingerprint) {
            if (checkpoint.accountId !== '') {
                const resolvedIndex = accountIds.indexOf(checkpoint.accountId);
                startIndex = resolvedIndex >= 0 ? resolvedIndex : 0;
            } else if (checkpoint.accountIndex <= accounts.length) {
                startIndex = checkpoint.accountIndex;
            }
        }

        for (let i = startIndex; i < accounts.length; i++) {
            const account = accounts[i];
            if (!account) {
                continue;
            }
            const accountId = account.accountId;

            // https://www.zoho.com/mail/help/api/get-all-label-details.html
            const labelsResponse = await nango.get({
                endpoint: `/api/accounts/${encodeURIComponent(accountId)}/labels`,
                retries: 3
            });

            const parsedLabelsResponse = LabelsResponseSchema.safeParse(labelsResponse.data);
            if (!parsedLabelsResponse.success) {
                throw new Error(`Failed to parse labels response for account ${accountId}: ${parsedLabelsResponse.error.message}`);
            }

            const labels = parsedLabelsResponse.data.data.map((item) => {
                const parsedLabel = LabelItemSchema.safeParse(item);
                if (!parsedLabel.success) {
                    throw new Error(`Failed to parse label item for account ${accountId}: ${parsedLabel.error.message}`);
                }

                const labelData = parsedLabel.data;

                return {
                    id: labelData.labelId,
                    accountId: accountId,
                    labelId: labelData.labelId,
                    displayName: labelData.displayName,
                    color: labelData.color,
                    sequence: labelData.sequence,
                    tagId: labelData.tagId,
                    uri: labelData.URI
                };
            });

            if (labels.length > 0) {
                await nango.batchSave(labels, 'Label');
            }

            const nextAccount = accounts[i + 1];
            await nango.saveCheckpoint({
                accountIndex: i + 1,
                accountId: nextAccount?.accountId ?? '',
                accountsFingerprint
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Label');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
