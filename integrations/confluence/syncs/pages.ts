import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    spaceIds: z.array(z.string()).optional(),
    cloudId: z.string().optional()
});

const CheckpointSchema = z.object({
    deleteTrackingStarted: z.boolean(),
    spaceIndex: z.number(),
    pageCursor: z.string()
});

const PageResultSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    title: z.string().optional(),
    spaceId: z.string().optional(),
    parentId: z.string().nullable().optional(),
    parentType: z.string().nullable().optional(),
    authorId: z.string().optional(),
    ownerId: z.string().optional(),
    lastOwnerId: z.string().nullable().optional(),
    subtype: z.string().optional(),
    createdAt: z.string().optional(),
    version: z
        .object({
            createdAt: z.string().optional(),
            message: z.string().optional(),
            number: z.number().optional(),
            minorEdit: z.boolean().optional(),
            authorId: z.string().optional()
        })
        .optional(),
    body: z.record(z.string(), z.unknown()).optional(),
    _links: z
        .object({
            webui: z.string().optional(),
            editui: z.string().optional(),
            tinyui: z.string().optional()
        })
        .optional()
});

const PagesResponseSchema = z.object({
    results: z.array(PageResultSchema).optional(),
    _links: z
        .object({
            next: z.string().optional(),
            base: z.string().optional()
        })
        .optional()
});

const PageSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    title: z.string().optional(),
    spaceId: z.string().optional(),
    parentId: z.string().optional(),
    parentType: z.string().optional(),
    authorId: z.string().optional(),
    ownerId: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    versionNumber: z.number().optional(),
    bodyStorage: z.string().optional(),
    url: z.string().optional()
});

const sync = createSync({
    description: 'Sync Confluence pages across accessible spaces or configured space ids.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Page: PageSchema
    },
    metadata: MetadataSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/pages'
        }
    ],

    exec: async (nango) => {
        const metadata = MetadataSchema.parse((await nango.getMetadata()) ?? {});
        const checkpoint = (await nango.getCheckpoint()) ?? {
            deleteTrackingStarted: false,
            spaceIndex: 0,
            pageCursor: ''
        };

        const cloudId = await getCloudId(nango);
        const spaceIds = metadata.spaceIds ?? [];

        if (!checkpoint.deleteTrackingStarted) {
            await nango.trackDeletesStart('Page');
            await nango.saveCheckpoint({ deleteTrackingStarted: true, spaceIndex: 0, pageCursor: '' });
        }

        if (spaceIds.length === 0) {
            await syncAllPages(nango, cloudId, checkpoint);
        } else {
            await syncConfiguredSpacesPages(nango, cloudId, spaceIds, checkpoint);
        }

        await nango.trackDeletesEnd('Page');
        await nango.clearCheckpoint();
    }
});

async function getCloudId(nango: NangoSyncLocal): Promise<string> {
    const metadata = MetadataSchema.parse((await nango.getMetadata()) ?? {});
    if (typeof metadata.cloudId === 'string' && metadata.cloudId.length > 0) {
        return metadata.cloudId;
    }

    const connection = await nango.getConnection();
    const configCloudId = connection.connection_config?.['cloudId'];
    if (typeof configCloudId === 'string' && configCloudId.length > 0) {
        return configCloudId;
    }

    // https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/
    const response = await nango.get({
        endpoint: 'oauth/token/accessible-resources',
        baseUrlOverride: 'https://api.atlassian.com',
        retries: 3
    });

    const AccessibleResourceSchema = z.object({
        id: z.string(),
        url: z.string().optional(),
        name: z.string().optional(),
        scopes: z.array(z.string()).optional(),
        avatarUrl: z.string().optional()
    });

    const resources = z.array(AccessibleResourceSchema).parse(response.data);
    const firstResource = resources[0];
    if (!firstResource?.id) {
        throw new Error('No accessible Confluence resource found');
    }

    await nango.updateMetadata({ cloudId: firstResource.id });
    return firstResource.id;
}

async function syncAllPages(nango: NangoSyncLocal, cloudId: string, checkpoint: z.infer<typeof CheckpointSchema>): Promise<void> {
    let cursor: string | undefined = checkpoint.pageCursor || undefined;

    do {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-get
            endpoint: '/wiki/api/v2/pages',
            baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
            params: {
                'body-format': 'storage',
                limit: 5,
                ...(cursor && { cursor })
            },
            retries: 3
        });

        const parsed = PagesResponseSchema.parse(response.data);
        const pages = mapPages(parsed.results ?? []);

        if (pages.length > 0) {
            await nango.batchSave(pages, 'Page');
        }

        const nextUrl = parsed._links?.next;
        if (!nextUrl) {
            break;
        }

        cursor = extractCursor(nextUrl, parsed._links?.base);
        await nango.saveCheckpoint({
            deleteTrackingStarted: true,
            spaceIndex: 0,
            pageCursor: cursor
        });
    } while (true);
}

async function syncConfiguredSpacesPages(
    nango: NangoSyncLocal,
    cloudId: string,
    spaceIds: string[],
    checkpoint: z.infer<typeof CheckpointSchema>
): Promise<void> {
    const startIndex = checkpoint.spaceIndex;

    for (let i = startIndex; i < spaceIds.length; i++) {
        const spaceId = spaceIds[i];
        let cursor: string | undefined = i === startIndex ? checkpoint.pageCursor || undefined : undefined;

        do {
            const response = await nango.get({
                // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-spaces-id-pages-get
                endpoint: `/wiki/api/v2/spaces/${spaceId}/pages`,
                baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
                params: {
                    'body-format': 'storage',
                    limit: 100,
                    ...(cursor && { cursor })
                },
                retries: 3
            });

            const parsed = PagesResponseSchema.parse(response.data);
            const pages = mapPages(parsed.results ?? []);

            if (pages.length > 0) {
                await nango.batchSave(pages, 'Page');
            }

            const nextUrl = parsed._links?.next;
            if (!nextUrl) {
                break;
            }

            cursor = extractCursor(nextUrl, parsed._links?.base);
            await nango.saveCheckpoint({
                deleteTrackingStarted: true,
                spaceIndex: i,
                pageCursor: cursor
            });
        } while (true);

        await nango.saveCheckpoint({
            deleteTrackingStarted: true,
            spaceIndex: i + 1,
            pageCursor: ''
        });
    }
}

function mapPages(results: z.infer<typeof PageResultSchema>[]): z.infer<typeof PageSchema>[] {
    return results.map((result) => {
        const bodyStorage =
            typeof result.body === 'object' &&
            result.body !== null &&
            'storage' in result.body &&
            typeof result.body['storage'] === 'object' &&
            result.body['storage'] !== null &&
            'value' in result.body['storage']
                ? String(result.body['storage']['value'])
                : undefined;

        return {
            id: result.id,
            ...(result.status && { status: result.status }),
            ...(result.title && { title: result.title }),
            ...(result.spaceId && { spaceId: result.spaceId }),
            ...(result.parentId && { parentId: result.parentId }),
            ...(result.parentType && { parentType: result.parentType }),
            ...(result.authorId && { authorId: result.authorId }),
            ...(result.ownerId && { ownerId: result.ownerId }),
            ...(result.createdAt && { createdAt: result.createdAt }),
            ...(result.version?.createdAt && { updatedAt: result.version.createdAt }),
            ...(result.version?.number !== undefined && { versionNumber: result.version.number }),
            ...(bodyStorage && { bodyStorage }),
            ...(result._links?.webui && { url: result._links.webui })
        };
    });
}

function extractCursor(nextUrl: string, baseUrl: string | undefined): string {
    // @allowTryCatch: Confluence may return an invalid next URL; fail the sync instead of finishing an incomplete full refresh
    try {
        const url = baseUrl ? new URL(nextUrl, baseUrl) : new URL(nextUrl);
        const cursor = url.searchParams.get('cursor');
        if (!cursor) {
            throw new Error('Confluence pages response included a next link without a cursor');
        }

        return cursor;
    } catch {
        throw new Error('Failed to parse the next cursor from the Confluence pages response');
    }
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
