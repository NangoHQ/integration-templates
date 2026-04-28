import { createSync } from 'nango';
import { z } from 'zod';

const SpaceSchema = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    type: z.string().optional(),
    status: z.string().optional(),
    authorId: z.string().optional(),
    createdAt: z.string().optional(),
    homepageId: z.string().optional(),
    currentActiveAlias: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const MetadataSchema = z.object({
    cloudId: z.string().optional()
});

const SpaceListResponseSchema = z.object({
    results: z.array(SpaceSchema),
    _links: z
        .object({
            next: z.string().optional(),
            base: z.string().optional()
        })
        .optional()
});

const AccessibleResourcesSchema = z.array(
    z.object({
        id: z.string()
    })
);

function parseCursorFromLink(nextLink: string): string | undefined {
    const url = new URL(nextLink, 'https://dummy');
    const cursor = url.searchParams.get('cursor');
    return cursor ?? undefined;
}

async function getCloudId(nango: NangoSyncLocal): Promise<string> {
    const connection = await nango.getConnection();
    const configCloudId = connection.connection_config?.['cloudId'];
    if (typeof configCloudId === 'string' && configCloudId.length > 0) {
        return configCloudId;
    }

    const metadata = await nango.getMetadata();
    if (metadata && typeof metadata === 'object' && 'cloudId' in metadata) {
        const metaCloudId = metadata.cloudId;
        if (typeof metaCloudId === 'string' && metaCloudId.length > 0) {
            return metaCloudId;
        }
    }

    const response = await nango.get({
        // https://developer.atlassian.com/cloud/confluence/rest/v1/api-group-search/
        endpoint: 'oauth/token/accessible-resources',
        baseUrlOverride: 'https://api.atlassian.com',
        retries: 3
    });

    const resources = AccessibleResourcesSchema.parse(response.data);
    if (resources.length === 0) {
        throw new Error('No accessible Confluence resources found');
    }
    if (resources.length > 1) {
        throw new Error('Multiple Confluence sites found. Please set an explicit cloudId in the connection metadata or connection_config.');
    }
    const cloudId = resources[0]!.id;

    await nango.updateMetadata({ cloudId });

    return cloudId;
}

const sync = createSync({
    description: 'Sync Confluence spaces visible to the authenticated user.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/spaces' }],
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        Space: SpaceSchema
    },
    scopes: ['read:space:confluence'],

    exec: async (nango) => {
        const cloudId = await getCloudId(nango);
        const checkpoint = await nango.getCheckpoint();
        let cursor = checkpoint?.cursor;

        let deleteTrackingStarted = false;
        if (!cursor) {
            await nango.trackDeletesStart('Space');
            deleteTrackingStarted = true;
        }

        let hasMore = true;

        try {
            while (hasMore) {
                const response = await nango.get({
                    // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-get
                    endpoint: '/wiki/api/v2/spaces',
                    params: {
                        limit: 250,
                        ...(cursor && { cursor })
                    },
                    baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
                    retries: 3
                });

                const data = SpaceListResponseSchema.parse(response.data);

                const spaces = data.results.map((space) => ({
                    id: space.id,
                    key: space.key,
                    name: space.name,
                    ...(space.type && { type: space.type }),
                    ...(space.status && { status: space.status }),
                    ...(space.authorId && { authorId: space.authorId }),
                    ...(space.createdAt && { createdAt: space.createdAt }),
                    ...(space.homepageId && { homepageId: space.homepageId }),
                    ...(space.currentActiveAlias && { currentActiveAlias: space.currentActiveAlias })
                }));

                if (spaces.length > 0) {
                    await nango.batchSave(spaces, 'Space');
                }

                const nextLink = data._links?.next;
                if (nextLink) {
                    const nextCursor = parseCursorFromLink(nextLink);
                    if (nextCursor) {
                        cursor = nextCursor;
                        await nango.saveCheckpoint({ cursor });
                        continue;
                    }
                }

                hasMore = false;
            }
        } finally {
            if (deleteTrackingStarted) {
                await nango.trackDeletesEnd('Space');
            }
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
