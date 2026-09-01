import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        limit: z.number().min(1).max(100).optional().describe('Maximum number of jobs to return. Default is 30, maximum is 100.'),
        order_by: z
            .enum(['created_datetime:asc', 'created_datetime:desc'])
            .optional()
            .describe('Attribute used to order jobs. Default is created_datetime:desc.'),
        status: z
            .enum(['cancel_requested', 'canceled', 'done', 'errored', 'fatal_errored', 'pending', 'running', 'scheduled'])
            .optional()
            .describe('Filter jobs by status.'),
        type: z
            .enum([
                'applyMacro',
                'deleteTicket',
                'exportTicket',
                'importMacro',
                'exportMacro',
                'updateTicket',
                'exportTicketDrilldown',
                'exportConvertCampaignSalesDrilldown'
            ])
            .optional()
            .describe('Filter jobs by job type.')
    })
    .describe('Input for listing Gorgias bulk-operation jobs with optional pagination and filters.');

const JobSchema = z.object({
    id: z.number().describe('ID of the job.'),
    cancel_requested_datetime: z.string().optional().describe('When the job cancellation was requested.'),
    cancelled_datetime: z.string().optional().describe('When the job was canceled.'),
    created_datetime: z.string().optional().describe('When the job was created.'),
    ended_datetime: z.string().optional().describe('When the job ended.'),
    failed_datetime: z.string().optional().describe('When the job failed.'),
    info: z.record(z.string(), z.unknown()).optional().describe('Data concerning the progress of the job.'),
    locked_datetime: z.string().optional().describe('When the job was locked.'),
    meta: z.record(z.string(), z.unknown()).optional().describe('Metadata associated with the job.'),
    params: z.record(z.string(), z.unknown()).optional().describe('The parameters of the job.'),
    scheduled_datetime: z.string().optional().describe('When the job was scheduled to be started.'),
    started_datetime: z.string().optional().describe('When the job started.'),
    status: z.string().describe('The status of the job.'),
    type: z.string().describe('The type of the job.'),
    user_id: z.number().describe('The ID of the user who created this job.'),
    uri: z.string().describe('URI of the job.')
});

const OutputSchema = z
    .object({
        items: z.array(JobSchema).describe('The list of jobs matching the filters.'),
        next_cursor: z.string().optional().describe('Cursor for the next page, if more results exist.')
    })
    .describe('Output containing a list of Gorgias bulk-operation jobs and an optional pagination cursor.');

const ProviderJobSchema = z.object({
    id: z.number(),
    cancel_requested_datetime: z.string().nullable().optional(),
    cancelled_datetime: z.string().nullable().optional(),
    created_datetime: z.string().nullable().optional(),
    ended_datetime: z.string().nullable().optional(),
    failed_datetime: z.string().nullable().optional(),
    info: z.record(z.string(), z.unknown()).optional(),
    locked_datetime: z.string().nullable().optional(),
    meta: z.record(z.string(), z.unknown()).nullable().optional(),
    params: z.record(z.string(), z.unknown()).optional(),
    scheduled_datetime: z.string().nullable().optional(),
    started_datetime: z.string().nullable().optional(),
    status: z.string(),
    type: z.string(),
    user_id: z.number(),
    uri: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()),
    meta: z
        .object({
            next_cursor: z.string().nullable().optional()
        })
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Reads the list of bulk-operation jobs from the Gorgias API.
 * @pitfalls: Bulk jobs are asynchronous and can run for hours; a canceled job does not revert changes already applied.
 */
const action = createAction({
    description: 'List bulk-operation jobs (e.g., bulk delete/export), filterable by status and type.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.gorgias.com/reference/list-jobs
            endpoint: '/api/jobs',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.order_by !== undefined && { order_by: input.order_by }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.type !== undefined && { type: input.type })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((item) => {
            const job = ProviderJobSchema.parse(item);
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
                status: job.status,
                type: job.type,
                user_id: job.user_id,
                uri: job.uri
            };
        });

        return {
            items,
            ...(providerResponse.meta?.next_cursor != null && { next_cursor: providerResponse.meta.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
