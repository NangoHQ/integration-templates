import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('ID of the job to retrieve. Example: 1234')
    })
    .describe('Input for retrieving a single job.');

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the job.'),
        cancel_requested_datetime: z.string().optional().describe('When the job cancellation was requested.'),
        cancelled_datetime: z.string().optional().describe('When the job was canceled.'),
        created_datetime: z.string().optional().describe('When the job was created.'),
        ended_datetime: z.string().optional().describe('When the job ended.'),
        failed_datetime: z.string().optional().describe('When the job failed.'),
        info: z.record(z.string(), z.unknown()).optional().describe('Data concerning the progress of the job.'),
        locked_datetime: z.string().optional().describe('When the job was locked. A job is only locked while it is actively running.'),
        meta: z.record(z.string(), z.unknown()).optional().describe('Metadata associated with the job.'),
        params: z.record(z.string(), z.unknown()).optional().describe('The parameters of the job.'),
        scheduled_datetime: z.string().optional().describe('When the job was scheduled to be started.'),
        started_datetime: z.string().optional().describe('When the job started.'),
        status: z.string().optional().describe('The status of the job.'),
        type: z.string().optional().describe('The type of the job.'),
        user_id: z.number().optional().describe('The ID of the user who created this job.'),
        uri: z.string().optional().describe('URI of the job.')
    })
    .describe('Output representing a single job status and metadata.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single job's status and metadata from the provider.
 * @pitfalls: Jobs run asynchronously; this action returns a point-in-time snapshot, so callers must poll when status is pending or running.
 */
const action = createAction({
    description: "Retrieve a single job's status/progress.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch: nango.get throws on 404; we need to convert that to a structured ActionError.
        try {
            const response = await nango.get({
                // https://developers.gorgias.com/reference/get-job
                endpoint: `/api/jobs/${encodeURIComponent(input.id)}`,
                retries: 3
            });

            const jobSchema = z.object({
                id: z.number(),
                cancel_requested_datetime: z.string().nullable().optional(),
                cancelled_datetime: z.string().nullable().optional(),
                created_datetime: z.string().nullable().optional(),
                ended_datetime: z.string().nullable().optional(),
                failed_datetime: z.string().nullable().optional(),
                info: z.record(z.string(), z.unknown()).nullable().optional(),
                locked_datetime: z.string().nullable().optional(),
                meta: z.record(z.string(), z.unknown()).nullable().optional(),
                params: z.record(z.string(), z.unknown()).nullable().optional(),
                scheduled_datetime: z.string().nullable().optional(),
                started_datetime: z.string().nullable().optional(),
                status: z.string().nullable().optional(),
                type: z.string().nullable().optional(),
                user_id: z.number().nullable().optional(),
                uri: z.string().nullable().optional()
            });

            const job = jobSchema.parse(response.data);

            return {
                id: job.id,
                ...(job.cancel_requested_datetime != null && { cancel_requested_datetime: job.cancel_requested_datetime }),
                ...(job.cancelled_datetime != null && { cancelled_datetime: job.cancelled_datetime }),
                ...(job.created_datetime != null && { created_datetime: job.created_datetime }),
                ...(job.ended_datetime != null && { ended_datetime: job.ended_datetime }),
                ...(job.failed_datetime != null && { failed_datetime: job.failed_datetime }),
                ...(job.info != null && { info: job.info }),
                ...(job.locked_datetime != null && { locked_datetime: job.locked_datetime }),
                ...(job.meta != null && { meta: job.meta }),
                ...(job.params != null && { params: job.params }),
                ...(job.scheduled_datetime != null && { scheduled_datetime: job.scheduled_datetime }),
                ...(job.started_datetime != null && { started_datetime: job.started_datetime }),
                ...(job.status != null && { status: job.status }),
                ...(job.type != null && { type: job.type }),
                ...(job.user_id != null && { user_id: job.user_id }),
                ...(job.uri != null && { uri: job.uri })
            };
        } catch (error) {
            const axiosErrorSchema = z.object({
                response: z.object({
                    status: z.number(),
                    data: z.unknown()
                })
            });
            const axiosResult = axiosErrorSchema.safeParse(error);
            if (axiosResult.success && axiosResult.data.response.status === 404) {
                const notFoundSchema = z.object({
                    error: z.object({
                        msg: z.string()
                    })
                });
                const notFoundResult = notFoundSchema.safeParse(axiosResult.data.response.data);
                if (notFoundResult.success) {
                    throw new nango.ActionError({
                        type: 'not_found',
                        message: notFoundResult.data.error.msg
                    });
                }
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
