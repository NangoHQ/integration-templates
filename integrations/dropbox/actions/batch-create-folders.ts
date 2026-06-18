import { z } from 'zod';
import { createAction } from 'nango';

const FolderMetadataSchema = z.object({
    name: z.string(),
    path_lower: z.string().optional(),
    path_display: z.string().optional(),
    id: z.string()
});

const EntrySuccessSchema = z.object({
    '.tag': z.literal('success'),
    metadata: FolderMetadataSchema
});

const EntryFailureSchema = z.object({
    '.tag': z.literal('failure'),
    failure: z.object({
        '.tag': z.string(),
        reason: z
            .object({
                '.tag': z.string()
            })
            .optional()
    })
});

const EntryResultSchema = z.union([EntrySuccessSchema, EntryFailureSchema]);

const CreateFolderBatchResultSchema = z.object({
    entries: z.array(EntryResultSchema),
    '.tag': z.literal('complete').optional()
});

const CreateFolderBatchLaunchSchema = z.union([
    // Complete response - has entries directly
    CreateFolderBatchResultSchema.extend({
        '.tag': z.literal('complete')
    }),
    // Async response - has async_job_id
    z.object({
        '.tag': z.literal('async_job_id'),
        async_job_id: z.string()
    })
]);

const JobStatusInProgressSchema = z.object({
    '.tag': z.union([z.literal('in_progress'), z.literal('async_job_id')]),
    async_job_id: z.string().optional()
});

const JobStatusFailedSchema = z.object({
    '.tag': z.literal('failed'),
    failed: z.object({
        '.tag': z.string()
    })
});

const JobStatusSchema = z.union([
    // Complete status - has entries directly
    CreateFolderBatchResultSchema.extend({
        '.tag': z.literal('complete')
    }),
    JobStatusInProgressSchema,
    JobStatusFailedSchema
]);

const InputSchema = z.object({
    paths: z
        .array(z.string().min(1))
        .min(1)
        .max(10000)
        .describe('List of paths to be created in the Dropbox. Max 10000 items. Example: ["/Projects/2024", "/Projects/2025"]'),
    autorename: z
        .boolean()
        .optional()
        .describe('If there is a conflict, have the Dropbox server try to autorename the folder to avoid the conflict. Default: false'),
    force_async: z.boolean().optional().describe('Whether to force the create to happen asynchronously. Default: false'),
    poll_interval_ms: z
        .number()
        .int()
        .min(100)
        .max(30000)
        .optional()
        .describe('Polling interval in milliseconds when checking async job status. Default: 1000'),
    max_poll_attempts: z.number().int().min(1).max(60).optional().describe('Maximum number of polling attempts for async job status. Default: 30')
});

const FolderResultSchema = z.object({
    path: z.string(),
    success: z.boolean(),
    id: z.string().optional(),
    name: z.string().optional(),
    error: z.string().optional()
});

const OutputSchema = z.object({
    completed: z.boolean().describe('Whether the batch operation completed successfully'),
    async_job_id: z.string().optional().describe('The async job ID if the operation is still in progress'),
    folders: z.array(FolderResultSchema).optional().describe('Array of results for each folder creation attempt'),
    total_count: z.number().int().describe('Total number of folders in the batch'),
    success_count: z.number().int().describe('Number of folders successfully created'),
    failure_count: z.number().int().describe('Number of folders that failed to create')
});

const action = createAction({
    description: 'Create multiple Dropbox folders in one batch request',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['files.content.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const pollInterval = input.poll_interval_ms ?? 1000;
        const maxPollAttempts = input.max_poll_attempts ?? 30;

        // https://www.dropbox.com/developers/documentation/http/documentation#files-create_folder_batch
        const launchResponse = await nango.post({
            endpoint: '/2/files/create_folder_batch',
            data: {
                paths: input.paths,
                autorename: input.autorename ?? false,
                force_async: input.force_async ?? false
            },
            retries: 3
        });

        const launchResult = CreateFolderBatchLaunchSchema.parse(launchResponse.data);

        // Handle synchronous completion
        if (launchResult['.tag'] === 'complete') {
            return processBatchResult(input.paths, launchResult);
        }

        // Handle async job - poll for completion
        const asyncJobId = launchResult.async_job_id;
        let attempts = 0;

        while (attempts < maxPollAttempts) {
            attempts += 1;

            // https://www.dropbox.com/developers/documentation/http/documentation#files-create_folder_batch-check
            const statusResponse = await nango.post({
                endpoint: '/2/files/create_folder_batch/check',
                data: {
                    async_job_id: asyncJobId
                },
                retries: 3
            });

            const jobStatus = JobStatusSchema.parse(statusResponse.data);

            if (jobStatus['.tag'] === 'complete') {
                return processBatchResult(input.paths, jobStatus);
            }

            if (jobStatus['.tag'] === 'failed') {
                throw new nango.ActionError({
                    type: 'batch_failed',
                    message: `Batch folder creation failed: ${jobStatus.failed['.tag']}`,
                    async_job_id: asyncJobId
                });
            }

            // Job still in progress, wait before polling again
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }

        // Polling timed out - return the job ID for later checking
        return {
            completed: false,
            async_job_id: asyncJobId,
            total_count: input.paths.length,
            success_count: 0,
            failure_count: 0
        };
    }
});

/**
 * Process the batch result and map to output format
 */
function processBatchResult(paths: string[], result: z.infer<typeof CreateFolderBatchResultSchema>): z.infer<typeof OutputSchema> {
    const folders: z.infer<typeof FolderResultSchema>[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < result.entries.length; i++) {
        const entry = result.entries[i]!;
        const path = paths[i] ?? 'unknown';

        if (entry['.tag'] === 'success') {
            folders.push({
                path,
                success: true,
                id: entry.metadata.id,
                name: entry.metadata.name
            });
            successCount += 1;
        } else {
            folders.push({
                path,
                success: false,
                error: entry.failure['.tag']
            });
            failureCount += 1;
        }
    }

    return {
        completed: true,
        folders,
        total_count: paths.length,
        success_count: successCount,
        failure_count: failureCount
    };
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
