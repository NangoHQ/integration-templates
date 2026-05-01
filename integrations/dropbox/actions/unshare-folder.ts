import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sharedFolderId: z.string().describe('The ID for the shared folder. Example: "84528192421"'),
    leaveACopy: z
        .boolean()
        .optional()
        .describe(
            'If true, members of this shared folder will get a copy of this folder after it is unshared. Otherwise, it will be removed from their Dropbox. The current user, who is an owner, will always retain their copy.'
        )
});

const LaunchEmptyResultSchema = z
    .object({
        '.tag': z.string(),
        async_job_id: z.string().optional()
    })
    .passthrough();

const JobStatusSchema = z
    .object({
        '.tag': z.string(),
        failed: z
            .object({
                '.tag': z.string().optional(),
                unshare_folder_error: z.unknown().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Unshare a Dropbox shared folder as its owner.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/unshare-folder',
        group: 'Sharing'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['sharing.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/documentation#sharing-unshare_folder
        const unshareResponse = await nango.post({
            endpoint: '/2/sharing/unshare_folder',
            data: {
                shared_folder_id: input.sharedFolderId,
                leave_a_copy: input.leaveACopy ?? false
            },
            retries: 3
        });

        const launchResult = LaunchEmptyResultSchema.parse(unshareResponse.data);

        // If the job completes synchronously, return success
        if (launchResult['.tag'] === 'complete') {
            return {
                success: true,
                message: 'Folder unshared successfully'
            };
        }

        // If async_job_id is returned, poll the job status
        const asyncJobId = launchResult.async_job_id;
        if (!asyncJobId) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Expected async_job_id in response but not found'
            });
        }

        // Poll the job status until it completes
        // https://www.dropbox.com/developers/documentation/http/documentation#sharing-check_job_status
        const maxAttempts = 30;
        const pollIntervalMs = 2000;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

            const statusResponse = await nango.post({
                endpoint: '/2/sharing/check_job_status',
                data: {
                    async_job_id: asyncJobId
                },
                retries: 3
            });

            const jobStatus = JobStatusSchema.parse(statusResponse.data);
            const tag = jobStatus['.tag'];

            if (tag === 'complete') {
                return {
                    success: true,
                    message: 'Folder unshared successfully'
                };
            }

            if (tag === 'failed') {
                const failedData = jobStatus.failed;
                throw new nango.ActionError({
                    type: 'unshare_failed',
                    message: 'Failed to unshare folder',
                    error: failedData ?? statusResponse.data
                });
            }

            // If still in_progress, continue polling
        }

        throw new nango.ActionError({
            type: 'timeout',
            message: 'Job status polling timed out. The unshare operation may still be in progress.',
            async_job_id: asyncJobId
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
