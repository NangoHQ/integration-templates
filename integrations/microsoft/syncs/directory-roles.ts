import { createSync } from 'nango';
import { z } from 'zod';

// https://learn.microsoft.com/en-us/graph/api/directoryrole-list
const DirectoryRoleSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    roleTemplateId: z.string().optional()
});

type DirectoryRole = z.infer<typeof DirectoryRoleSchema>;

const MicrosoftDirectoryRoleSchema = z.object({
    id: z.string(),
    displayName: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    roleTemplateId: z.string().nullable().optional(),
    '@removed': z
        .object({
            reason: z.string().optional()
        })
        .optional()
});

const DeltaResponseSchema = z.object({
    value: z.array(MicrosoftDirectoryRoleSchema),
    '@odata.nextLink': z.string().optional(),
    '@odata.deltaLink': z.string().optional()
});

const CheckpointSchema = z.object({
    deltaLink: z.string()
});

const DIRECTORY_ROLE_SELECT_FIELDS = 'id,displayName,description,roleTemplateId';

function extractPathFromUrl(url: string): string {
    if (url.startsWith('https://')) {
        const urlObj = new URL(url);
        return `${urlObj.pathname}${urlObj.search}`;
    }

    return url;
}

const sync = createSync({
    description: 'Sync directory roles from Microsoft',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        DirectoryRole: DirectoryRoleSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/directory-roles'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let currentEndpoint = checkpoint?.deltaLink
            ? extractPathFromUrl(checkpoint.deltaLink)
            : `/v1.0/directoryRoles/delta?$select=${DIRECTORY_ROLE_SELECT_FIELDS}`;
        let lastDeltaLink = '';

        while (true) {
            const response = await nango.get({
                endpoint: currentEndpoint,
                retries: 3
            });

            const parsed = DeltaResponseSchema.parse(response.data);
            const upserts: DirectoryRole[] = [];
            const deletions: Array<{ id: string }> = [];

            for (const role of parsed.value) {
                if (role['@removed']) {
                    deletions.push({ id: role.id });
                    continue;
                }

                upserts.push({
                    id: role.id,
                    ...(role.displayName != null && { displayName: role.displayName }),
                    ...(role.description != null && { description: role.description }),
                    ...(role.roleTemplateId != null && { roleTemplateId: role.roleTemplateId })
                });
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'DirectoryRole');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'DirectoryRole');
            }

            if (parsed['@odata.nextLink']) {
                currentEndpoint = extractPathFromUrl(parsed['@odata.nextLink']);
                continue;
            }

            lastDeltaLink = parsed['@odata.deltaLink'] ?? '';
            break;
        }

        if (lastDeltaLink) {
            await nango.saveCheckpoint({ deltaLink: lastDeltaLink });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
