import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// https://platform.openai.com/docs/api-reference/files/list
const FileSchema = z.object({
    id: z.string(),
    object: z.string().optional(),
    bytes: z.number().optional(),
    created_at: z.number().optional(),
    filename: z.string().optional(),
    purpose: z.string().optional(),
    status: z.string().optional(),
    status_details: z.string().optional().nullable()
});

// Checkpoint schema: ZodCheckpoint requires non-optional primitive fields
const CheckpointSchema = z.object({
    after: z.string()
});

type FileRecord = {
    id: string;
    object?: string;
    bytes?: number;
    created_at?: number;
    filename?: string;
    purpose?: string;
    status?: string;
    status_details?: string | null;
};

const sync = createSync<{ File: typeof FileSchema }, undefined, typeof CheckpointSchema>({
    description: 'Sync files from OpenAI.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/files' }],
    checkpoint: CheckpointSchema,
    models: {
        File: FileSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const proxyConfig: ProxyConfiguration = {
            // https://platform.openai.com/docs/api-reference/files/list
            endpoint: '/v1/files',
            params: {
                order: 'asc',
                limit: 100,
                ...(checkpoint && checkpoint.after && { after: checkpoint.after })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'after',
                cursor_path_in_response: 'last_id',
                response_path: 'data',
                limit_name_in_request: 'limit'
            },
            retries: 3
        };

        for await (const files of nango.paginate<FileRecord>(proxyConfig)) {
            const mappedFiles = files.map((file) => ({
                id: file.id,
                ...(file.object !== undefined && { object: file.object }),
                ...(file.bytes !== undefined && { bytes: file.bytes }),
                ...(file.created_at !== undefined && { created_at: file.created_at }),
                ...(file.filename !== undefined && { filename: file.filename }),
                ...(file.purpose !== undefined && { purpose: file.purpose }),
                ...(file.status !== undefined && { status: file.status }),
                ...(file.status_details !== undefined && {
                    status_details: file.status_details
                })
            }));

            if (mappedFiles.length > 0) {
                await nango.batchSave(mappedFiles, 'File');

                // Save last_id as cursor for resumption
                const lastFile = files[files.length - 1];
                if (lastFile && lastFile.id) {
                    await nango.saveCheckpoint({ after: lastFile.id });
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
