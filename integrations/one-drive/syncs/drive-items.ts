import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

// https://learn.microsoft.com/graph/api/resources/driveitem
const DriveItemSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        size: z.number().optional(),
        createdDateTime: z.string().optional(),
        lastModifiedDateTime: z.string().optional(),
        webUrl: z.string().optional(),
        downloadUrl: z.string().optional(),
        file: z.object({}).passthrough().optional(),
        folder: z.object({}).passthrough().optional(),
        parentReference: z.object({ id: z.string().optional() }).passthrough().optional(),
        deleted: z.object({}).optional()
    })
    .passthrough();

// Schema for the delta API response envelope
const DeltaResponseSchema = z.object({
    '@odata.nextLink': z.string().optional(),
    '@odata.deltaLink': z.string().optional(),
    value: z.array(z.unknown())
});

// Checkpoint schema - cursor stores the delta token
// Empty string means no cursor (initial sync)
const CheckpointSchema = z.object({
    cursor: z.string()
});

// Graph delta pages expose a resumable token in nextLink and deltaLink URLs.
function extractDeltaToken(link: string | undefined): string | undefined {
    if (!link) {
        return undefined;
    }

    try {
        const url = new URL(link, 'https://graph.microsoft.com');
        const token = url.searchParams.get('token');
        if (token) {
            return token;
        }
    } catch {
        // Fall back to the path-based token formats used by Graph delta links.
    }

    const tokenMatch = link.match(/[?&]token=([^&]+)/) || link.match(/\(token='([^']+)'\)/) || link.match(/\(token=([^)]+)\)/);
    const token = tokenMatch?.[1];
    return token ? decodeURIComponent(token) : undefined;
}

const sync = createSync({
    description: 'Sync the OneDrive file and folder hierarchy using drive root delta.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/drive-items' }],
    checkpoint: CheckpointSchema,
    models: {
        DriveItem: DriveItemSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let cursor = checkpoint?.['cursor'] || '';

        // Build the endpoint URL with optional token
        // https://learn.microsoft.com/graph/api/driveitem-delta
        let endpoint = '/v1.0/me/drive/root/delta';
        if (cursor) {
            endpoint = `/v1.0/me/drive/root/delta?token=${encodeURIComponent(cursor)}`;
        }

        // https://learn.microsoft.com/graph/api/driveitem-delta
        const paginateConfig: NonNullable<ProxyConfiguration['paginate']> = {
            type: 'link',
            link_path_in_response_body: '@odata.nextLink',
            response_path: 'value',
            limit: 100,
            limit_name_in_request: '$top',
            on_page: async ({ response }) => {
                // Save whichever Graph state token this page exposes so the next run can resume.
                const parsedResponse = DeltaResponseSchema.safeParse(response.data);
                if (parsedResponse.success) {
                    const stateLink = parsedResponse.data['@odata.nextLink'] ?? parsedResponse.data['@odata.deltaLink'];
                    const newToken = extractDeltaToken(stateLink);
                    if (newToken) {
                        cursor = newToken;
                    }
                }
            }
        };

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/graph/api/driveitem-delta
            endpoint: endpoint,
            paginate: paginateConfig,
            retries: 3
        };

        for await (const page of nango.paginate<z.infer<typeof DriveItemSchema>>(proxyConfig)) {
            const upserts: z.infer<typeof DriveItemSchema>[] = [];
            const deletions: { id: string }[] = [];

            for (const item of page) {
                if (item.deleted) {
                    deletions.push({ id: item.id });
                } else {
                    upserts.push(item);
                }
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'DriveItem');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'DriveItem');
            }

            // Save the latest Graph state token after each page so long crawls can resume.
            if (cursor) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        if (!cursor) {
            // An empty drive may not surface a usable token in mocks; keep a stable empty checkpoint.
            await nango.saveCheckpoint({ cursor: '' });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
