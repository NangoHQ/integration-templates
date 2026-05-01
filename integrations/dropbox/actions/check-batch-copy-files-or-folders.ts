import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    async_job_id: z.string().describe('The async job ID returned by batch-copy-files-or-folders. Example: "dbjid:AAAcrHLQ..."')
});

const CopyBatchEntryResultSchema = z.object({
    '.tag': z.string(),
    metadata: z
        .object({
            name: z.string(),
            path_lower: z.string(),
            path_display: z.string().optional(),
            id: z.string(),
            content_hash: z.string().optional(),
            server_modified: z.string().optional()
        })
        .optional(),
    failure: z
        .object({
            '.tag': z.string(),
            description: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    '.tag': z.enum(['in_progress', 'complete', 'failed']),
    entries: z.array(CopyBatchEntryResultSchema).optional()
});

const action = createAction({
    description: 'Check the status of a Dropbox batch copy job using its async job ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/check-batch-copy-files-or-folders',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.content.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-copy_batch-check_v2
        const response = await nango.post({
            endpoint: '/2/files/copy_batch/check_v2',
            data: { async_job_id: input.async_job_id },
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
