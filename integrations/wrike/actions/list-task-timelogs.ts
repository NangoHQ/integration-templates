import { z } from 'zod';
import { createAction } from 'nango';

const TimelogSchema = z.object({
    id: z.string().describe('Unique timelog ID. Example: "IEAG5DAKJQAC56AJ".'),
    taskId: z.string().describe('ID of the task this time entry is logged against. Example: "MAAAAAEQ_HoO".'),
    userId: z.string().describe('ID of the user who logged the time. Example: "KUAZR5CO".'),
    hours: z.number().describe('Number of hours logged, in the range 0 to 24. Example: 1.5.'),
    trackedDate: z.string().describe('Date the time was tracked for, in yyyy-MM-dd format. Example: "2026-10-08".'),
    createdDate: z.string().describe('Timestamp when the timelog was created, in yyyy-MM-ddTHH:mm:ssZ format.'),
    updatedDate: z.string().describe('Timestamp when the timelog was last updated, in yyyy-MM-ddTHH:mm:ssZ format.'),
    comment: z.string().optional().describe('Comment attached to the timelog. Omitted when empty.'),
    categoryId: z.string().optional().describe('ID of the timelog category, when one is assigned.'),
    billingType: z.enum(['Billable', 'NonBillable']).optional().describe('Billing type. Only present when requested via fields.'),
    approvalStatus: z
        .enum(['Draft', 'NotSubmitted', 'Approved', 'Rejected', 'Cancelled', 'Pending'])
        .optional()
        .describe('Timesheet approval status. Only present when requested via fields.'),
    exportStatus: z.enum(['NotExported', 'Exported', 'ReadyForExport']).optional().describe('Export status. Only present when requested via fields.'),
    lockStatus: z.enum(['Locked', 'Unlocked']).optional().describe('Timelog lock status. Only present when requested via fields.'),
    finance: z
        .object({
            currency: z.string().optional().describe('Currency of the finance amounts. Example: "US Dollar".'),
            actualFees: z.number().optional().describe('Actual fees billed for the time entry.'),
            actualCost: z.number().optional().describe('Actual internal cost of the time entry.')
        })
        .optional()
        .describe('Finance details. Only present when requested via fields.')
});

const InputSchema = z
    .object({
        taskId: z.string().describe('ID of the task whose time entries should be listed. Example: "MAAAAAEQ_HoO".'),
        cursor: z.string().optional().describe('Pagination token returned as nextCursor by a previous call. Omit for the first page.'),
        pageSize: z
            .number()
            .int()
            .min(1)
            .max(1000)
            .optional()
            .describe('Number of timelogs to return per page (1-1000). When omitted, all matching timelogs are returned in a single response.'),
        fields: z
            .array(z.enum(['approvalStatus', 'lockStatus', 'exportStatus', 'billingType', 'finance']))
            .optional()
            .describe('Optional timelog fields to include in the response. These fields are omitted unless explicitly requested.')
    })
    .describe('Input for listing time-tracking entries logged against a specific task.');

const OutputSchema = z
    .object({
        timelogs: z.array(TimelogSchema).describe('Time entries logged against the task.'),
        nextCursor: z.string().optional().describe('Token to pass as cursor to fetch the next page. Absent when there are no more results.')
    })
    .describe('Time-tracking entries logged against the requested task, with an optional pagination cursor.');

const ProviderResponseSchema = z.object({
    data: z.array(TimelogSchema),
    nextPageToken: z.string().optional()
});

/**
 * @tags: [read]
 * @tagReason: Reads time-tracking entries for a task without modifying provider state.
 * @pitfalls: Optional fields (billingType, approvalStatus, exportStatus, lockStatus, finance) are omitted unless requested via fields; only time logged directly on the task is returned, so subtask entries are not included; a task with no logged time returns an empty timelogs array rather than an error.
 */
const action = createAction({
    description: 'List time-tracking entries logged against a specific task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.wrike.com/reference/gettaskssingletimelogs
            endpoint: `/tasks/${encodeURIComponent(input.taskId)}/timelogs`,
            params: {
                ...(input.cursor !== undefined && { nextPageToken: input.cursor }),
                ...(input.pageSize !== undefined && { pageSize: input.pageSize }),
                ...(input.fields !== undefined && { fields: JSON.stringify(input.fields) })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            timelogs: parsed.data,
            // Wrike returns a nextPageToken with an empty page that it then rejects, so only expose it alongside results.
            ...(parsed.data.length > 0 && parsed.nextPageToken != null && parsed.nextPageToken !== '' && { nextCursor: parsed.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
