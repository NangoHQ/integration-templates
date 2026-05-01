import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    async_job_id: z.string().describe('The async job ID returned by unshare-folder. Example: "dbjid:AAAcrHLQ..."')
});

const OutputSchema = z.object({
    success: z.boolean(),
    status: z.enum(['complete', 'in_progress', 'failed']),
    message: z.string().optional()
});

const action = createAction({
    description: 'Check the status of a Dropbox unshare folder job using its async job ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/check-unshare-folder',
        group: 'Sharing'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['sharing.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/documentation#sharing-check_job_status
        const response = await nango.post({
            endpoint: '/2/sharing/check_job_status',
            data: { async_job_id: input.async_job_id },
            retries: 3
        });

        const parsed = z
            .object({
                '.tag': z.string(),
                failed: z.unknown().optional()
            })
            .parse(response.data);

        if (parsed['.tag'] === 'complete') {
            return { success: true, status: 'complete', message: 'Folder unshared successfully' };
        }

        if (parsed['.tag'] === 'failed') {
            throw new nango.ActionError({
                type: 'unshare_failed',
                message: 'Failed to unshare folder',
                error: parsed.failed
            });
        }

        return { success: false, status: 'in_progress' };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
