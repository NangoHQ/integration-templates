import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

// https://learn.microsoft.com/graph/api/resources/driveitem
const UserFileSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    webUrl: z.string().optional(),
    downloadUrl: z.string().optional(),
    mimeType: z.string().optional(),
    file: z
        .object({
            mimeType: z.string().optional()
        })
        .optional(),
    folder: z
        .object({
            childCount: z.number().optional()
        })
        .optional(),
    parentReference: z
        .object({
            id: z.string().optional(),
            path: z.string().optional()
        })
        .optional(),
    deleted: z
        .object({
            state: z.string().optional()
        })
        .optional()
});

type UserFile = z.infer<typeof UserFileSchema>;

const DeltaResponseSchema = z.object({
    '@odata.nextLink': z.string().optional(),
    '@odata.deltaLink': z.string().optional(),
    value: z.array(z.unknown())
});

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

// Checkpoint uses delta token (cursor) for resuming delta sync
// https://learn.microsoft.com/graph/api/driveitem-delta
// Note: ZodCheckpoint requires all fields to be ZodString|ZodNumber|ZodBoolean without .optional()
const CheckpointSchema = z.object({
    deltaToken: z.string()
});

const sync = createSync({
    description: 'Sync file metadata from the user OneDrive',
    version: '3.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/user-files'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        UserFile: UserFileSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // Graph delta returns a resumable state token in nextLink and deltaLink responses.
        let deltaToken =
            checkpoint && typeof checkpoint === 'object' && 'deltaToken' in checkpoint && typeof checkpoint.deltaToken === 'string'
                ? checkpoint.deltaToken
                : '';

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/graph/api/driveitem-delta
            endpoint: '/v1.0/me/drive/root/delta',
            params: {
                // Use delta token if available, otherwise fetch full listing
                ...(deltaToken ? { token: deltaToken } : {}),
                // Include deleted items to track deletions
                $select: 'id,name,size,createdDateTime,lastModifiedDateTime,webUrl,file,folder,parentReference,deleted'
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: '@odata.nextLink',
                response_path: 'value',
                limit_name_in_request: '$top',
                limit: 100,
                on_page: async ({ response }) => {
                    const parsedResponse = DeltaResponseSchema.safeParse(response.data);
                    if (parsedResponse.success) {
                        const stateLink = parsedResponse.data['@odata.nextLink'] ?? parsedResponse.data['@odata.deltaLink'];
                        const nextToken = extractDeltaToken(stateLink);
                        if (nextToken) {
                            deltaToken = nextToken;
                        }
                    }
                }
            },
            retries: 3
        };

        type DriveItem = {
            id: string;
            name?: string;
            size?: number;
            createdDateTime?: string;
            lastModifiedDateTime?: string;
            webUrl?: string;
            '@microsoft.graph.downloadUrl'?: string;
            file?: { mimeType?: string };
            folder?: { childCount?: number };
            parentReference?: { id?: string; path?: string };
            deleted?: { state?: string };
        };

        for await (const page of nango.paginate<DriveItem>(proxyConfig)) {
            const upserts: UserFile[] = [];
            const deletions: { id: string }[] = [];

            for (const item of page) {
                // Check if item is deleted via the deleted facet
                // https://learn.microsoft.com/graph/api/driveitem-delta#deleted-facet
                if (item.deleted) {
                    deletions.push({ id: item.id });
                } else {
                    upserts.push({
                        id: item.id,
                        ...(item.name !== undefined && { name: item.name }),
                        ...(item.size !== undefined && { size: item.size }),
                        ...(item.createdDateTime !== undefined && { createdDateTime: item.createdDateTime }),
                        ...(item.lastModifiedDateTime !== undefined && { lastModifiedDateTime: item.lastModifiedDateTime }),
                        ...(item.webUrl !== undefined && { webUrl: item.webUrl }),
                        ...(item['@microsoft.graph.downloadUrl'] !== undefined && { downloadUrl: item['@microsoft.graph.downloadUrl'] }),
                        ...(item.file !== undefined && {
                            file: { ...(item.file.mimeType !== undefined && { mimeType: item.file.mimeType }) },
                            ...(item.file.mimeType !== undefined && { mimeType: item.file.mimeType })
                        }),
                        ...(item.folder !== undefined && {
                            folder: { ...(item.folder.childCount !== undefined && { childCount: item.folder.childCount }) }
                        }),
                        ...(item.parentReference !== undefined && {
                            parentReference: {
                                ...(item.parentReference.id !== undefined && { id: item.parentReference.id }),
                                ...(item.parentReference.path !== undefined && { path: item.parentReference.path })
                            }
                        })
                    });
                }
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'UserFile');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'UserFile');
            }

            if (deltaToken) {
                await nango.saveCheckpoint({ deltaToken });
            }
        }

        if (deltaToken) {
            await nango.saveCheckpoint({ deltaToken });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
