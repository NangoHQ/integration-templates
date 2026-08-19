import { createSync } from 'nango';
import { OrganizationalUnit } from '../models.js';
import { z } from 'zod';

const OrganizationUnitSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    name: z.string(),
    description: z.string().optional().nullable(),
    orgUnitPath: z.string(),
    orgUnitId: z.string(),
    parentOrgUnitPath: z.string().optional().nullable(),
    parentOrgUnitId: z.string().optional().nullable()
});

const OrganizationUnitResponseSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    organizationUnits: z.array(OrganizationUnitSchema).optional().nullable(),
    nextPageToken: z.string().optional().nullable()
});

const CheckpointSchema = z.object({
    page_token: z.string(),
    root_unit_id: z.string()
});

const sync = createSync({
    description: 'Sync all workspace org units',
    version: '2.1.0',
    frequency: 'every 6 hours',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        OrganizationalUnit: OrganizationalUnit
    },

    scopes: ['https://www.googleapis.com/auth/admin.directory.orgunit.readonly', 'https://www.googleapis.com/auth/admin.directory.user.readonly'],

    metadata: z.object({}),

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = checkpoint ? CheckpointSchema.parse(checkpoint) : null;
        let pageToken = parsedCheckpoint?.page_token || undefined;
        const rootUnitId = parsedCheckpoint?.root_unit_id || undefined;

        const endpoint = '/admin/directory/v1/customer/my_customer/orgunits';

        const rootUnit: OrganizationalUnit = {
            name: '{Root Directory}',
            description: 'Root Directory',
            path: '/',
            id: rootUnitId ?? '',
            parentPath: null,
            parentId: null,
            createdAt: null,
            deletedAt: null
        };

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('OrganizationalUnit');

        // Re-save the root unit on resumed executions so it survives delete tracking.
        if (rootUnitId) {
            await nango.batchSave([rootUnit], 'OrganizationalUnit');
        }

        do {
            const params = pageToken ? { type: 'all', pageToken } : { type: 'all' };

            const response = await nango.get({
                baseUrlOverride: 'https://admin.googleapis.com',
                endpoint,
                params,
                retries: 5
            });

            const parsed = OrganizationUnitResponseSchema.parse(response.data);

            if (parsed.organizationUnits) {
                if (
                    !rootUnit.id &&
                    parsed.organizationUnits.length > 0 &&
                    parsed.organizationUnits[0]?.parentOrgUnitId &&
                    parsed.organizationUnits[0]?.parentOrgUnitPath === '/'
                ) {
                    rootUnit.id = parsed.organizationUnits[0].parentOrgUnitId;

                    await nango.batchSave([rootUnit], 'OrganizationalUnit');
                }

                const units = parsed.organizationUnits.map((ou) => ({
                    name: ou.name,
                    description: ou.description ?? null,
                    path: ou.orgUnitPath,
                    id: ou.orgUnitId,
                    parentPath: ou.parentOrgUnitPath ?? null,
                    parentId: ou.parentOrgUnitId ?? null,
                    createdAt: null,
                    deletedAt: null
                }));

                await nango.batchSave(units, 'OrganizationalUnit');
            }

            pageToken = parsed.nextPageToken ?? undefined;
            const nextRootUnitId = rootUnit.id || undefined;

            await nango.saveCheckpoint({
                page_token: pageToken ?? '',
                root_unit_id: nextRootUnitId ?? ''
            });
        } while (pageToken);

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('OrganizationalUnit');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
