import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DeltaMailFolderSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    parentFolderId: z.string().optional(),
    childFolderCount: z.number().int().optional(),
    totalItemCount: z.number().int().optional(),
    unreadItemCount: z.number().int().optional(),
    sizeInBytes: z.number().int().optional(),
    isHidden: z.boolean().optional(),
    '@removed': z
        .object({
            reason: z.string()
        })
        .optional()
});

const MailFolderSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    parentFolderId: z.string().optional(),
    childFolderCount: z.number().int().optional(),
    totalItemCount: z.number().int().optional(),
    unreadItemCount: z.number().int().optional(),
    sizeInBytes: z.number().int().optional(),
    isHidden: z.boolean().optional()
});

const CheckpointSchema = z.object({
    cursorUrl: z.string()
});

const DeltaPageSchema = z.object({
    value: z.array(z.any()).default([]),
    '@odata.nextLink': z.string().optional(),
    '@odata.deltaLink': z.string().optional()
});

type MailFolder = z.infer<typeof MailFolderSchema>;

const sync = createSync({
    description: 'Sync the mail folder hierarchy',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/mail-folders'
        }
    ],
    models: {
        MailFolder: MailFolderSchema
    },
    checkpoint: CheckpointSchema,

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { cursorUrl: '' });

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/graph/api/mailfolder-delta
            endpoint: checkpoint.cursorUrl || '/v1.0/me/mailFolders/delta',
            paginate: {
                type: 'link',
                link_path_in_response_body: '@odata.nextLink'
            },
            retries: 3
        };

        for await (const rawPage of nango.paginate<any>(proxyConfig)) {
            const page = DeltaPageSchema.parse(rawPage);
            const upserts: MailFolder[] = [];
            const deletions: Array<{ id: string }> = [];

            for (const rawFolder of Array.isArray(page.value) ? page.value : []) {
                const folder = DeltaMailFolderSchema.parse(rawFolder);

                if (folder['@removed']) {
                    deletions.push({ id: folder.id });
                    continue;
                }

                if (!folder.displayName) {
                    throw new Error(`Mail folder ${folder.id} is missing displayName`);
                }

                upserts.push({
                    id: folder.id,
                    displayName: folder.displayName,
                    ...(folder.parentFolderId !== undefined && { parentFolderId: folder.parentFolderId }),
                    ...(folder.childFolderCount !== undefined && { childFolderCount: folder.childFolderCount }),
                    ...(folder.totalItemCount !== undefined && { totalItemCount: folder.totalItemCount }),
                    ...(folder.unreadItemCount !== undefined && { unreadItemCount: folder.unreadItemCount }),
                    ...(folder.sizeInBytes !== undefined && { sizeInBytes: folder.sizeInBytes }),
                    ...(folder.isHidden !== undefined && { isHidden: folder.isHidden })
                });
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'MailFolder');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'MailFolder');
            }

            const cursorUrl = page['@odata.nextLink'] ?? page['@odata.deltaLink'];

            if (cursorUrl) {
                await nango.saveCheckpoint({ cursorUrl });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
