import { z } from 'zod';
import { createAction } from 'nango';

const DeleteEntrySchema = z.object({
    path: z.string().describe('Path in the user\'s Dropbox to delete. Example: "/Homework/math/Prime_Numbers.txt"')
});

const InputSchema = z.object({
    entries: z.array(DeleteEntrySchema).describe('List of files/folders to delete. Each entry has a path field.').min(1)
});

const DeleteResultEntrySchema = z.object({
    '.tag': z.string(),
    name: z.string().optional(),
    path_lower: z.string().optional(),
    path_display: z.string().optional(),
    parent_shared_folder_id: z.string().optional(),
    id: z.string().optional()
});

const DeleteBatchResultEntrySchema = z.object({
    '.tag': z.string(),
    metadata: DeleteResultEntrySchema.optional(),
    success: z.object({}).optional(),
    failure: z.object({}).optional()
});

const DeleteBatchResultSchema = z.object({
    entries: z.array(DeleteBatchResultEntrySchema)
});

const DeleteBatchLaunchSchema = z.object({
    '.tag': z.string(),
    async_job_id: z.string().optional(),
    complete: DeleteBatchResultSchema.optional()
});

const DeleteBatchJobStatusSchema = z.object({
    '.tag': z.string(),
    async_job_id: z.string().optional(),
    complete: DeleteBatchResultSchema.optional(),
    in_progress: z.object({}).optional(),
    failed: z.object({}).optional()
});

const OutputSchema = z.object({
    status: z.enum(['complete', 'in_progress', 'failed']).describe('Status of the batch deletion operation'),
    async_job_id: z.string().optional().describe('If status is in_progress, the job ID to poll for completion'),
    entries: z.array(DeleteBatchResultEntrySchema).optional().describe('Results for each entry if the operation is complete')
});

const action = createAction({
    description: 'Delete multiple Dropbox files or folders in one batch job',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/batch-delete-files-or-folders',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.content.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/documentation#files-delete_batch
        const launchResponse = await nango.post({
            endpoint: '/2/files/delete_batch',
            data: {
                entries: input.entries.map((entry) => ({ path: entry.path }))
            },
            retries: 3
        });

        const launchResult = DeleteBatchLaunchSchema.parse(launchResponse.data);

        // If complete synchronously, return results immediately
        if (launchResult['.tag'] === 'complete' && launchResult.complete) {
            return {
                status: 'complete',
                entries: launchResult.complete.entries
            };
        }

        // If async job, poll for completion
        if (launchResult['.tag'] === 'async_job_id' && launchResult.async_job_id) {
            const asyncJobId = launchResult.async_job_id;
            const maxAttempts = 30;
            const pollIntervalMs = 2000;

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                // https://www.dropbox.com/developers/documentation/http/documentation#files-delete_batch-check
                const checkResponse = await nango.post({
                    endpoint: '/2/files/delete_batch/check',
                    data: {
                        async_job_id: asyncJobId
                    },
                    retries: 3
                });

                const jobStatus = DeleteBatchJobStatusSchema.parse(checkResponse.data);

                if (jobStatus['.tag'] === 'complete' && jobStatus.complete) {
                    return {
                        status: 'complete',
                        entries: jobStatus.complete.entries
                    };
                }

                if (jobStatus['.tag'] === 'failed') {
                    throw new nango.ActionError({
                        type: 'batch_delete_failed',
                        message: 'Batch delete job failed',
                        async_job_id: asyncJobId
                    });
                }

                if (jobStatus['.tag'] === 'in_progress') {
                    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
                }
            }

            // If we exhausted all attempts, return the job ID for the caller to poll later
            return {
                status: 'in_progress',
                async_job_id: asyncJobId
            };
        }

        throw new nango.ActionError({
            type: 'unexpected_response',
            message: 'Unexpected response from delete_batch endpoint',
            response_tag: launchResult['.tag']
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
