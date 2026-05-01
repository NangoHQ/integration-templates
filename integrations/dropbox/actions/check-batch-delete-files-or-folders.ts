import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    async_job_id: z.string().describe('The async job ID returned by batch-delete-files-or-folders. Example: "dbjid:AAAcrHLQ..."')
});

const DeleteBatchResultEntrySchema = z.object({
    '.tag': z.string(),
    metadata: z
        .object({
            '.tag': z.string(),
            name: z.string().optional(),
            path_lower: z.string().optional(),
            path_display: z.string().optional(),
            id: z.string().optional()
        })
        .optional(),
    failure: z.object({}).passthrough().optional()
});

const OutputSchema = z.object({
    status: z.enum(['complete', 'in_progress', 'failed']).describe('Status of the batch deletion check'),
    entries: z.array(DeleteBatchResultEntrySchema).optional().describe('Per-entry results when status is complete')
});

const action = createAction({
    description: 'Check the status of a Dropbox batch delete job using its async job ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/check-batch-delete-files-or-folders',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.content.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-delete_batch-check
        const response = await nango.post({
            endpoint: '/2/files/delete_batch/check',
            data: { async_job_id: input.async_job_id },
            retries: 3
        });

        const parsed = z
            .object({
                '.tag': z.string(),
                entries: z.array(DeleteBatchResultEntrySchema).optional()
            })
            .parse(response.data);

        if (parsed['.tag'] === 'complete') {
            return { status: 'complete', entries: parsed.entries };
        }

        if (parsed['.tag'] === 'failed') {
            return { status: 'failed' };
        }

        return { status: 'in_progress' };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
