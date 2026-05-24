import { createSync } from 'nango';
import { z } from 'zod';

// https://learn.microsoft.com/en-us/graph/api/resources/group
const GroupSchema = z.object({
    id: z.string(),
    displayName: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    mail: z.string().nullable().optional(),
    mailNickname: z.string().nullable().optional(),
    groupTypes: z.array(z.string()).nullable().optional(),
    securityEnabled: z.boolean().nullable().optional(),
    mailEnabled: z.boolean().nullable().optional(),
    visibility: z.string().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    renewedDateTime: z.string().nullable().optional(),
    deletedDateTime: z.string().nullable().optional()
});

type Group = z.infer<typeof GroupSchema>;

// https://learn.microsoft.com/en-us/graph/api/group-delta
const DeltaGroupSchema = z.intersection(
    GroupSchema,
    z.object({
        '@removed': z
            .object({
                reason: z.string().optional()
            })
            .optional()
    })
);

const DeltaResponseSchema = z.object({
    value: z.array(DeltaGroupSchema),
    '@odata.nextLink': z.string().optional(),
    '@odata.deltaLink': z.string().optional()
});

// Checkpoint schema must be z.object with non-optional primitive value types
// The actual runtime value can be missing keys; we use empty string as sentinel
const CheckpointSchema = z.object({
    delta_link: z.string()
});

/**
 * Extracts the path and query string from a full Microsoft Graph URL.
 * Microsoft Graph returns full URLs in @odata.nextLink and @odata.deltaLink,
 * but we need just the path for the Nango proxy.
 */
function extractPathFromUrl(url: string): string {
    // Handle both full URLs and relative paths
    if (url.startsWith('https://')) {
        const urlObj = new URL(url);
        return urlObj.pathname.replace('/v1.0', '/v1.0') + urlObj.search;
    }
    return url;
}

const sync = createSync({
    description: 'Sync groups from Microsoft Graph with incremental delta tracking',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/groups' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Group: GroupSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const deltaLink = checkpoint?.delta_link;
        let currentEndpoint = deltaLink && deltaLink.length > 0 ? extractPathFromUrl(deltaLink) : '/v1.0/groups/delta';
        let lastDeltaLink = '';
        let hasMorePages = true;

        while (hasMorePages) {
            // https://learn.microsoft.com/en-us/graph/api/group-delta
            const response = await nango.get({
                endpoint: currentEndpoint,
                retries: 3
            });

            const parsed = DeltaResponseSchema.parse(response.data);
            const upserts: Group[] = [];
            const deletions: Array<{ id: string }> = [];

            for (const group of parsed.value) {
                if (group['@removed']) {
                    deletions.push({ id: group.id });
                } else {
                    upserts.push(group);
                }
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'Group');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'Group');
            }

            if (parsed['@odata.nextLink']) {
                currentEndpoint = extractPathFromUrl(parsed['@odata.nextLink']);
            } else if (parsed['@odata.deltaLink']) {
                lastDeltaLink = parsed['@odata.deltaLink'];
                hasMorePages = false;
            } else {
                hasMorePages = false;
            }
        }

        if (lastDeltaLink.length > 0) {
            await nango.saveCheckpoint({ delta_link: lastDeltaLink });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
