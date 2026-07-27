import { createSync } from 'nango';
import { z } from 'zod';

const PermissionSetSchema = z.object({
    id: z.string(),
    name: z.string(),
    label: z.record(z.string(), z.string()).optional(),
    description: z.record(z.string(), z.string()).optional()
});

const sync = createSync({
    description: "Sync the account's custom permission sets/roles.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        PermissionSet: PermissionSetSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes /spi/v3/permission_sets with no changed-since filter,
        // no pagination, and no deleted-record endpoint.
        // https://workable.readme.io/reference/permission-sets
        const response = await nango.get({
            endpoint: '/spi/v3/permission_sets',
            retries: 3
        });

        const parsed = z.array(PermissionSetSchema).safeParse(response.data);

        if (!parsed.success) {
            throw new Error(`Failed to parse permission sets: ${parsed.error.message}`);
        }

        const permissionSets = parsed.data.map((record) => ({
            id: record.id,
            name: record.name,
            ...(record.label && { label: record.label }),
            ...(record.description && { description: record.description })
        }));

        // Only start delete-tracking once the request has succeeded and the response has been
        // validated, so a failed/invalid fetch never leaves deletion-tracking permanently "open".
        await nango.trackDeletesStart('PermissionSet');

        if (permissionSets.length > 0) {
            await nango.batchSave(permissionSets, 'PermissionSet');
        }

        await nango.trackDeletesEnd('PermissionSet');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
