import { z } from 'zod';
import { createAction } from 'nango';

const MoveEntrySchema = z.object({
    from_path: z.string().describe('Path of the file or folder to move. Example: "/folder/file.txt"'),
    to_path: z.string().describe('Destination path for the file or folder. Example: "/newfolder/file.txt"')
});

const InputSchema = z.object({
    entries: z.array(MoveEntrySchema).min(1).max(1000).describe('List of up to 1000 entries to move, each with from_path and to_path.')
});

const SuccessEntrySchema = z.object({
    '.tag': z.literal('success'),
    metadata: z
        .object({
            '.tag': z.union([z.literal('file'), z.literal('folder')]),
            id: z.string(),
            path_display: z.string().optional(),
            path_lower: z.string().optional(),
            name: z.string().optional()
        })
        .passthrough()
});

const RelocationEntryFailureSchema = z.object({
    '.tag': z.literal('failure'),
    failure: z.object({
        '.tag': z.string(),
        new_lookup_error: z
            .object({
                '.tag': z.string()
            })
            .optional(),
        to_path: z.string().optional(),
        from_path: z.string().optional()
    })
});

const RelocationEntryResultSchema = z.union([SuccessEntrySchema, RelocationEntryFailureSchema]);

const CompleteSchema = z.object({
    '.tag': z.literal('complete'),
    entries: z.array(RelocationEntryResultSchema)
});

const AsyncJobIdSchema = z.object({
    '.tag': z.literal('async_job_id'),
    async_job_id: z.string()
});

const MoveBatchV2ResponseSchema = z.union([CompleteSchema, AsyncJobIdSchema]);

const SuccessResultSchema = z.object({
    status: z.literal('success'),
    id: z.string(),
    name: z.string().optional(),
    path_display: z.string().optional(),
    path_lower: z.string().optional(),
    tag: z.union([z.literal('file'), z.literal('folder')])
});

const FailureResultSchema = z.object({
    status: z.literal('failure'),
    error_tag: z.string(),
    error_message: z.string(),
    to_path: z.string().optional(),
    from_path: z.string().optional()
});

const EntryResultSchema = z.union([SuccessResultSchema, FailureResultSchema]);

const OutputSchema = z.object({
    job_status: z.union([z.literal('complete'), z.literal('in_progress'), z.literal('failed')]),
    async_job_id: z.string().optional().describe('If job is in progress, this ID can be used to check status later.'),
    entries: z.array(EntryResultSchema)
});

function mapEntryResult(entry: z.infer<typeof RelocationEntryResultSchema>): z.infer<typeof EntryResultSchema> {
    if (entry['.tag'] === 'success') {
        return {
            status: 'success',
            id: entry.metadata.id,
            name: entry.metadata.name,
            path_display: entry.metadata.path_display,
            path_lower: entry.metadata.path_lower,
            tag: entry.metadata['.tag']
        };
    }
    return {
        status: 'failure',
        error_tag: entry.failure['.tag'],
        error_message: `Failed to move: ${entry.failure['.tag']}`,
        to_path: entry.failure.to_path,
        from_path: entry.failure.from_path
    };
}

const action = createAction({
    description: 'Move multiple Dropbox files or folders to new locations in one batch job.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/batch-move-files-or-folders',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.content.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-move_batch_v2
        const moveResponse = await nango.post({
            endpoint: '/2/files/move_batch_v2',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                entries: input.entries,
                autorename: false
            },
            retries: 3
        });

        const parsedMoveResponse = MoveBatchV2ResponseSchema.parse(moveResponse.data);

        // Handle async job - return job ID for later status check
        if (parsedMoveResponse['.tag'] === 'async_job_id') {
            return {
                job_status: 'in_progress',
                async_job_id: parsedMoveResponse.async_job_id,
                entries: []
            };
        }

        // Synchronous completion - results available immediately
        return {
            job_status: 'complete',
            entries: parsedMoveResponse.entries.map(mapEntryResult)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
