import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    async_job_id: z.string().describe('The async job ID returned by batch-move-files-or-folders. Example: "dbjid:AAAcrHLQ..."')
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
        to_path: z.string().optional(),
        from_path: z.string().optional()
    })
});

const RelocationEntryResultSchema = z.union([SuccessEntrySchema, RelocationEntryFailureSchema]);

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
    description: 'Check the status of a Dropbox batch move job using its async job ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/check-batch-move-files-or-folders',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.content.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-move_batch-check_v2
        const response = await nango.post({
            endpoint: '/2/files/move_batch/check_v2',
            data: { async_job_id: input.async_job_id },
            retries: 3
        });

        const parsed = z
            .object({
                '.tag': z.union([z.literal('complete'), z.literal('in_progress'), z.literal('failed')]),
                entries: z.array(RelocationEntryResultSchema).optional()
            })
            .parse(response.data);

        if (parsed['.tag'] === 'in_progress') {
            return { job_status: 'in_progress', entries: [] };
        }

        if (parsed['.tag'] === 'failed') {
            return { job_status: 'failed', entries: [] };
        }

        return {
            job_status: 'complete',
            entries: (parsed.entries ?? []).map(mapEntryResult)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
