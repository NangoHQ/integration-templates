import { createSync } from 'nango';
import { z } from 'zod';

// https://dropbox.github.io/dropbox-sdk-js/Dropbox.html#sharingListSharedLinks__anchor
// https://www.dropbox.com/developers/documentation/http/documentation

const SharedLinkMetadataSchema = z.object({
    '.tag': z.union([z.literal('file'), z.literal('folder')]).optional(),
    url: z.string(),
    id: z.string(),
    name: z.string(),
    path_lower: z.string().optional(),
    expires: z.string().optional(),
    client_modified: z.string().optional(),
    server_modified: z.string().optional()
});

const ListSharedLinksResponseSchema = z.object({
    links: z.array(SharedLinkMetadataSchema),
    has_more: z.boolean().optional(),
    cursor: z.string().optional()
});

const SharedLinkSchema = z.object({
    id: z.string(),
    url: z.string(),
    name: z.string(),
    path_lower: z.string().optional(),
    type: z.union([z.literal('file'), z.literal('folder')]).optional(),
    client_modified: z.string().optional(),
    server_modified: z.string().optional(),
    expires: z.string().optional()
});

// Checkpoint schema - empty string means no cursor (start from beginning)
const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync Dropbox shared links for the current user or configured path scopes.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        SharedLink: SharedLinkSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/shared-links'
        }
    ],

    exec: async (nango) => {
        const checkpoint = z.object({ cursor: z.string().optional() }).parse((await nango.getCheckpoint()) ?? {});

        const connectionSchema = z.object({
            metadata: z.object({ path: z.unknown().optional() }).nullish(),
            data: z.object({ metadata: z.object({ path: z.unknown().optional() }).nullish() }).optional()
        });
        const rawConnection = connectionSchema.parse(await nango.getConnection());
        const metadata = rawConnection.metadata ?? rawConnection.data?.metadata ?? {};
        const pathFilter = typeof metadata.path === 'string' && metadata.path.trim() ? metadata.path.trim() : undefined;

        // Dropbox shared links require a full refresh. The cursor only resumes pagination when
        // listing every shared link for the user, so we clear it after a successful run.
        // Reset any stored cursor before a delete-tracked run to ensure all records are seen.
        if (!pathFilter && checkpoint?.cursor) {
            await nango.clearCheckpoint();
        }

        await nango.trackDeletesStart('SharedLink');

        let cursor: string | undefined = undefined;
        let hasMore = true;

        try {
            while (hasMore) {
                // https://www.dropbox.com/developers/documentation/http/documentation#sharing-list_shared_links
                const response = await nango.post({
                    endpoint: '/2/sharing/list_shared_links',
                    data: {
                        ...(pathFilter && { path: pathFilter }),
                        ...(cursor && { cursor })
                    },
                    retries: 3
                });

                const parsed = ListSharedLinksResponseSchema.safeParse(response.data);

                if (!parsed.success) {
                    throw new Error(`Failed to parse shared links response: ${parsed.error.message}`);
                }

                const { links, has_more: responseHasMore, cursor: nextCursor } = parsed.data;

                const sharedLinks = links.map((link) => ({
                    id: link.id,
                    url: link.url,
                    name: link.name,
                    ...(link.path_lower !== undefined && { path_lower: link.path_lower }),
                    ...(link['.tag'] !== undefined && { type: link['.tag'] }),
                    ...(link.client_modified !== undefined && { client_modified: link.client_modified }),
                    ...(link.server_modified !== undefined && { server_modified: link.server_modified }),
                    ...(link.expires !== undefined && { expires: link.expires })
                }));

                if (sharedLinks.length > 0) {
                    await nango.batchSave(sharedLinks, 'SharedLink');
                }

                hasMore = (responseHasMore ?? false) && nextCursor !== undefined;
                cursor = nextCursor;

                if (!pathFilter && cursor !== undefined) {
                    await nango.saveCheckpoint({ cursor });
                }
            }

            await nango.clearCheckpoint();
        } finally {
            await nango.trackDeletesEnd('SharedLink');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
