import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ScimMemberSchema = z.object({
    value: z.string(),
    display: z.string().optional(),
    $ref: z.string().optional()
});

const ScimMetaSchema = z.object({
    resourceType: z.string().optional(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    location: z.string().optional(),
    version: z.string().optional()
});

const ScimGroupSchema = z.object({
    schemas: z.array(z.string()).optional(),
    id: z.string(),
    displayName: z.string(),
    externalId: z.string().optional(),
    members: z.array(ScimMemberSchema).optional(),
    meta: ScimMetaSchema.optional()
});

const GroupSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    externalId: z.string().optional(),
    members: z.array(ScimMemberSchema).optional(),
    meta: ScimMetaSchema.optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync SCIM groups from 1Password SCIM.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        // https://support.1password.com/scim-endpoints/
        { method: 'GET', path: '/syncs/scim-groups' }
    ],
    checkpoint: CheckpointSchema,
    models: {
        Group: GroupSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;

        const proxyConfig: ProxyConfiguration = {
            // https://support.1password.com/scim-endpoints/
            endpoint: '/Groups',
            params: {
                ...(updatedAfter && { filter: `meta.lastModified ge "${updatedAfter}"` }),
                sortBy: 'meta.lastModified',
                sortOrder: 'ascending'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'startIndex',
                offset_start_value: 1,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'Resources'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const groups = page.map((item: unknown) => {
                const parsed = ScimGroupSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse SCIM group: ${parsed.error.message}`);
                }
                return parsed.data;
            });

            if (groups.length === 0) {
                continue;
            }

            const records = groups.map((group) => ({
                id: group.id,
                displayName: group.displayName,
                ...(group.externalId !== undefined && { externalId: group.externalId }),
                ...(group.members !== undefined && { members: group.members }),
                ...(group.meta !== undefined && { meta: group.meta })
            }));

            await nango.batchSave(records, 'Group');

            const lastUpdatedAt = groups[groups.length - 1]?.meta?.lastModified;
            if (lastUpdatedAt) {
                await nango.saveCheckpoint({
                    updated_after: lastUpdatedAt
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
