import { createSync } from 'nango';
import { z } from 'zod';

const BetaFileScopeSchema = z.object({
    id: z.string(),
    type: z.string()
});

const FileMetadataSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    filename: z.string(),
    mime_type: z.string(),
    size_bytes: z.number(),
    type: z.literal('file'),
    downloadable: z.boolean().optional(),
    scope: BetaFileScopeSchema.nullable().optional()
});

const FileListResponseSchema = z.object({
    data: z.array(FileMetadataSchema),
    first_id: z.string().optional(),
    has_more: z.boolean().optional(),
    last_id: z.string().optional()
});

const FileSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    filename: z.string(),
    mime_type: z.string(),
    size_bytes: z.number(),
    type: z.string(),
    downloadable: z.boolean().optional(),
    scope_id: z.string().optional(),
    scope_type: z.string().optional()
});

const CheckpointSchema = z.object({
    full_refresh: z.boolean(),
    after_id: z.string()
});

const LegacyCheckpointSchema = z.object({
    after_id: z.string()
});

const sync = createSync({
    description: 'Sync files from Anthropic.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        File: FileSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/files'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        let afterId: string | undefined;

        if (rawCheckpoint !== null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
            if (parsedCheckpoint.success) {
                if (parsedCheckpoint.data.full_refresh) {
                    afterId = parsedCheckpoint.data.after_id;
                }
            } else {
                const parsedLegacyCheckpoint = LegacyCheckpointSchema.safeParse(rawCheckpoint);
                if (!parsedLegacyCheckpoint.success) {
                    throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
                }

                // Ignore the legacy incremental checkpoint so the first run after this change
                // still performs a full crawl instead of resuming from a stale success cursor.
            }
        }

        while (true) {
            const params: Record<string, string | number> = {
                limit: 5
            };
            if (afterId) {
                params['after_id'] = afterId;
            }

            // https://docs.anthropic.com/en/api/files
            const response = await nango.get({
                endpoint: '/v1/files',
                headers: {
                    'anthropic-beta': 'files-api-2025-04-14',
                    'anthropic-version': '2023-06-01'
                },
                params: params,
                retries: 3
            });

            const parsed = FileListResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Invalid response from Anthropic files API: ${parsed.error.message}`);
            }

            const page = parsed.data;

            if (page.data.length > 0) {
                const files = page.data.map((file) => ({
                    id: file.id,
                    created_at: file.created_at,
                    filename: file.filename,
                    mime_type: file.mime_type,
                    size_bytes: file.size_bytes,
                    type: file.type,
                    ...(file.downloadable !== undefined && { downloadable: file.downloadable }),
                    ...(file.scope != null && { scope_id: file.scope.id, scope_type: file.scope.type })
                }));

                await nango.batchSave(files, 'File');
            }

            if (!page.has_more) {
                break;
            }
            if (!page.last_id) {
                throw new Error('Anthropic files API returned has_more=true but no last_id cursor');
            }

            afterId = page.last_id;
            await nango.saveCheckpoint({
                full_refresh: true,
                after_id: afterId
            });
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
