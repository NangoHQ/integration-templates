import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_content_base64: z.string().describe('The file content as a base64-encoded string'),
    dropbox_path: z.string().describe('The destination path in Dropbox. Example: "/folder/file.txt"'),
    mode: z.enum(['add', 'overwrite']).optional().describe('What to do if the file already exists. Default: "add"'),
    chunk_size: z.number().optional().describe('Size of each chunk in bytes. Default: 4194304 (4MB). Max: 150MB'),
    autorename: z.boolean().optional().describe('If true, rename the file if a conflict occurs. Default: false'),
    mute: z.boolean().optional().describe('If true, suppresses email notification. Default: false')
});

const StartSessionResponseSchema = z.object({
    session_id: z.string(),
    offset: z.number().optional()
});

const UploadSessionFinishResponseSchema = z
    .object({
        name: z.string().optional(),
        path_lower: z.string().optional(),
        id: z.string().optional(),
        content_hash: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    success: z.boolean(),
    path: z.string(),
    file_id: z.string().optional(),
    content_hash: z.string().optional(),
    name: z.string().optional()
});

/**
 * Upload a large file to Dropbox using upload sessions.
 *
 * The upload session API allows uploading files larger than the 150MB single-request limit.
 * Process:
 * 1. Start a session with /upload_session/start (can include first chunk)
 * 2. Append chunks with /upload_session/append_v2 using the session_id
 * 3. Finish with /upload_session/finish to commit the file
 *
 * Dropbox API docs:
 * - https://www.dropbox.com/developers/documentation/http/documentation#files-upload_session-start
 * - https://www.dropbox.com/developers/documentation/http/documentation#files-upload_session-append_v2
 * - https://www.dropbox.com/developers/documentation/http/documentation#files-upload_session-finish
 *
 * NOTE: The Nango action runtime does not allow fs/stream imports. Files must be passed
 * as base64-encoded strings and are held in memory during the upload session. For files
 * larger than ~500MB, consider splitting on the caller side or using a signed URL approach.
 */
const action = createAction({
    description: 'Upload a large file to Dropbox with an upload session',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/upload-large-file',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.content.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const chunkSize = input.chunk_size ?? 4 * 1024 * 1024; // Default 4MB
        const maxChunkSize = 150 * 1024 * 1024; // 150MB max per Dropbox

        if (chunkSize > maxChunkSize) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: `Chunk size cannot exceed ${maxChunkSize} bytes (150MB)`,
                chunk_size: chunkSize
            });
        }

        // @allowTryCatch Explicit handling of base64 decoding errors for user input validation
        let fileBuffer: Buffer;
        try {
            fileBuffer = Buffer.from(input.file_content_base64, 'base64');
        } catch (err) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Failed to decode base64 content',
                error: err instanceof Error ? err.message : String(err)
            });
        }

        const totalSize = fileBuffer.length;

        if (totalSize === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'File content cannot be empty'
            });
        }

        // Step 1: Start upload session with the first chunk
        // https://www.dropbox.com/developers/documentation/http/documentation#files-upload_session-start
        const firstChunk = fileBuffer.subarray(0, Math.min(chunkSize, totalSize));

        const startResponse = await nango.post({
            endpoint: '/2/files/upload_session/start',
            baseUrlOverride: 'https://content.dropboxapi.com',
            headers: {
                'Content-Type': 'application/octet-stream'
            },
            data: firstChunk,
            retries: 3
        });

        const startResult = StartSessionResponseSchema.safeParse(startResponse.data);
        if (!startResult.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Failed to parse upload session start response',
                error: startResult.error.message
            });
        }

        const sessionId = startResult.data.session_id;
        let offset = startResult.data.offset ?? firstChunk.length;

        // Step 2: Append remaining chunks
        // https://www.dropbox.com/developers/documentation/http/documentation#files-upload_session-append_v2
        while (offset < totalSize) {
            const chunk = fileBuffer.subarray(offset, offset + chunkSize);

            await nango.post({
                endpoint: '/2/files/upload_session/append_v2',
                baseUrlOverride: 'https://content.dropboxapi.com',
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Dropbox-API-Arg': JSON.stringify({
                        cursor: {
                            session_id: sessionId,
                            offset: offset
                        },
                        close: false
                    })
                },
                data: chunk,
                retries: 3
            });

            offset += chunk.length;
        }

        // Step 3: Finish upload session — empty body, all params in header
        // https://www.dropbox.com/developers/documentation/http/documentation#files-upload_session-finish
        const finishResponse = await nango.post({
            endpoint: '/2/files/upload_session/finish',
            baseUrlOverride: 'https://content.dropboxapi.com',
            headers: {
                'Content-Type': 'application/octet-stream',
                'Dropbox-API-Arg': JSON.stringify({
                    cursor: {
                        session_id: sessionId,
                        offset: totalSize
                    },
                    commit: {
                        path: input.dropbox_path,
                        mode: input.mode ?? 'add',
                        autorename: input.autorename ?? false,
                        mute: input.mute ?? false
                    }
                })
            },
            data: Buffer.alloc(0),
            retries: 3
        });

        const finishResult = UploadSessionFinishResponseSchema.safeParse(finishResponse.data);
        if (!finishResult.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Failed to parse upload session finish response',
                error: finishResult.error.message
            });
        }

        const finishData = finishResult.data;

        return {
            success: true,
            path: input.dropbox_path,
            file_id: finishData.id,
            content_hash: finishData.content_hash,
            name: finishData.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
