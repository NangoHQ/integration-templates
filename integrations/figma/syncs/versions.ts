import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    file_key: z.string().optional(),
    team_id: z.string().optional()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    handle: z.string(),
    img_url: z.string()
});

const ProviderVersionSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    label: z.string().nullable(),
    description: z.string().nullable(),
    thumbnail_url: z.string().optional().nullable(),
    user: ProviderUserSchema
});

const ProviderPaginationSchema = z.object({
    prev_page: z.string().optional().nullable(),
    next_page: z.string().optional().nullable()
});

const ProviderVersionsResponseSchema = z.object({
    versions: z.array(ProviderVersionSchema),
    pagination: ProviderPaginationSchema
});

const VersionSchema = z.object({
    id: z.string(),
    file_key: z.string(),
    created_at: z.string(),
    label: z.string().optional(),
    description: z.string().optional(),
    thumbnail_url: z.string().optional(),
    user: z
        .object({
            id: z.string(),
            handle: z.string().optional(),
            img_url: z.string().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    latest_version_id: z.string()
});

const sync = createSync({
    description: 'Sync versions from Figma.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Version: VersionSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/versions'
        }
    ],
    scopes: ['file_versions:read', 'files:read', 'team_library_content:read'],

    exec: async (nango) => {
        const metadata = MetadataSchema.parse((await nango.getMetadata()) ?? {});
        let fileKey = metadata.file_key;
        let teamId = metadata.team_id;

        if (!fileKey || !teamId) {
            const connection = await nango.getConnection();
            const connectionMetadata = connection.metadata ?? {};
            const connectionMetadataFileKey = connectionMetadata['file_key'];
            const connectionMetadataTeamId = connectionMetadata['team_id'];
            const connectionConfigFileKey = connection.connection_config?.['file_key'];

            if (!fileKey && typeof connectionMetadataFileKey === 'string') {
                fileKey = connectionMetadataFileKey;
            }

            if (!fileKey && typeof connectionConfigFileKey === 'string') {
                fileKey = connectionConfigFileKey;
            }

            if (!teamId && typeof connectionMetadataTeamId === 'string') {
                teamId = connectionMetadataTeamId;
            }
        }

        if (!fileKey && teamId) {
            // Some Figma connections are team-scoped. When that happens, use the
            // first team library style to discover a concrete file for versions.
            const discoveryResponse = await nango.get({
                endpoint: `/v1/teams/${encodeURIComponent(teamId)}/styles`,
                params: {
                    page_size: 1
                },
                retries: 3
            });

            const discoveryData = z
                .object({
                    meta: z.object({
                        styles: z.array(
                            z.object({
                                file_key: z.string()
                            })
                        )
                    })
                })
                .parse(discoveryResponse.data);

            fileKey = discoveryData.meta.styles[0]?.file_key;
        }

        if (!fileKey) {
            throw new Error('file_key is required in metadata or connection configuration');
        }

        const checkpointResult = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const checkpoint = checkpointResult.success ? checkpointResult.data : undefined;

        // Figma versions are ordered by creation time and expose pagination
        // links. We keep the newest seen version ID as a high-watermark and
        // walk older pages only until we reach it.
        let nextRequest:
            | {
                  endpoint: string;
                  params: Record<string, string | number>;
              }
            | undefined = {
            endpoint: `/v1/files/${encodeURIComponent(fileKey)}/versions`,
            params: {
                page_size: 50
            }
        };
        let latestVersionId: string | undefined;
        const seenVersionIds = new Set<string>();

        while (nextRequest) {
            // https://www.figma.com/developers/api#get-versions-endpoint
            const response = await nango.get({
                endpoint: nextRequest.endpoint,
                params: nextRequest.params,
                retries: 3
            });

            const parsed = ProviderVersionsResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Invalid response from Figma versions API: ${parsed.error.message}`);
            }

            const { versions, pagination } = parsed.data;
            if (latestVersionId === undefined && versions[0]) {
                latestVersionId = versions[0].id;
            }

            let versionsToSave = versions;
            if (checkpoint?.latest_version_id) {
                const checkpointIndex = versions.findIndex((version) => version.id === checkpoint.latest_version_id);
                if (checkpointIndex !== -1) {
                    versionsToSave = versions.slice(0, checkpointIndex);
                }
            }

            const unseenVersions = versionsToSave.filter((version) => {
                if (seenVersionIds.has(version.id)) {
                    return false;
                }

                seenVersionIds.add(version.id);
                return true;
            });

            const mapped = unseenVersions.map((version) => {
                return {
                    id: version.id,
                    file_key: fileKey,
                    created_at: version.created_at,
                    ...(version.label != null && { label: version.label }),
                    ...(version.description != null && { description: version.description }),
                    ...(version.thumbnail_url != null && { thumbnail_url: version.thumbnail_url }),
                    user: {
                        id: version.user.id,
                        ...(version.user.handle != null && { handle: version.user.handle }),
                        ...(version.user.img_url != null && { img_url: version.user.img_url })
                    }
                };
            });

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'Version');
            }

            if (versionsToSave.length !== versions.length || unseenVersions.length === 0) {
                break;
            }

            const prevPageUrl = pagination.prev_page;
            if (!prevPageUrl) {
                break;
            }

            const url = new URL(prevPageUrl);
            nextRequest = {
                endpoint: url.pathname,
                params: Object.fromEntries(url.searchParams.entries())
            };
        }

        if (latestVersionId) {
            await nango.saveCheckpoint({ latest_version_id: latestVersionId });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
