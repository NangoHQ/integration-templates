import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        timelogId: z.string().describe('ID of the timelog record to update. Example: "IEAG5DAKJQAC56AH"'),
        hours: z.number().optional().describe('New number of hours tracked for the timelog, between 0 and 24. Example: 3'),
        trackedDate: z.string().optional().describe('New date the time was tracked for, in yyyy-MM-dd format. Example: "2026-10-08"'),
        comment: z.string().optional().describe('New comment for the timelog. Pass an empty string to clear it.')
    })
    .describe('Fields identifying the timelog to update and the values to change.');

const ProviderTimelogSchema = z.object({
    id: z.string(),
    taskId: z.string().optional(),
    userId: z.string().optional(),
    hours: z.number().optional(),
    trackedDate: z.string().optional(),
    comment: z.string().optional(),
    categoryId: z.string().optional(),
    createdDate: z.string().optional(),
    updatedDate: z.string().optional(),
    billingType: z.string().optional(),
    approvalStatus: z.string().optional(),
    exportStatus: z.string().optional(),
    lockStatus: z.string().optional(),
    finance: z
        .object({
            currency: z.string().optional(),
            actualFees: z.number().optional(),
            actualCost: z.number().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderTimelogSchema)
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the timelog record. Example: "IEAG5DAKJQAC56AH"'),
        taskId: z.string().optional().describe('ID of the task the timelog belongs to. Example: "MAAAAAEQ_HoO"'),
        userId: z.string().optional().describe('ID of the user who tracked the time. Example: "KUAZR5CO"'),
        hours: z.number().optional().describe('Number of hours tracked for the timelog. Example: 3'),
        trackedDate: z.string().optional().describe('Date the time was tracked for, in yyyy-MM-dd format. Example: "2026-10-08"'),
        comment: z.string().optional().describe('Comment attached to the timelog; empty string when no comment is set.'),
        categoryId: z.string().optional().describe('ID of the timelog category assigned to the record, when set.'),
        createdDate: z.string().optional().describe('Timestamp when the timelog was created, in ISO 8601 format. Example: "2026-10-09T23:27:59Z"'),
        updatedDate: z.string().optional().describe('Timestamp when the timelog was last updated, in ISO 8601 format. Example: "2026-10-09T23:28:02Z"'),
        billingType: z.string().optional().describe('Billing type of the timelog, when requested. Example: "Billable"'),
        approvalStatus: z.string().optional().describe('Timesheet approval status of the timelog, when requested. Example: "NotSubmitted"'),
        exportStatus: z.string().optional().describe('Export status of the timelog, when requested. Example: "NotExported"'),
        lockStatus: z.string().optional().describe('Lock status of the timelog, when requested. Example: "Unlocked"'),
        finance: z
            .object({
                currency: z.string().optional().describe('Currency code for the timelog finance values. Example: "USD"'),
                actualFees: z.number().optional().describe('Actual fees calculated for the tracked time.'),
                actualCost: z.number().optional().describe('Actual cost calculated for the tracked time.')
            })
            .optional()
            .describe('Finance breakdown for the timelog, when available.')
    })
    .describe('The updated timelog record returned by Wrike.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing timelog record's hours, date, or comment in Wrike.
 * @pitfalls: hours is limited to 0 to 24 (out-of-range values are rejected), invoking with no editable fields still returns 200 and advances updatedDate without changing the entry, and passing an empty comment string clears the comment.
 */
const action = createAction({
    description: "Edit an existing time entry's hours, date, or comment.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.wrike.com/reference/puttimelogssingle
            endpoint: `/timelogs/${encodeURIComponent(input.timelogId)}`,
            data: {
                ...(input.hours !== undefined && { hours: input.hours }),
                ...(input.trackedDate !== undefined && { trackedDate: input.trackedDate }),
                ...(input.comment !== undefined && { comment: input.comment })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const timelog = parsed.data[0];

        if (!timelog) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Timelog not found',
                timelogId: input.timelogId
            });
        }

        return {
            id: timelog.id,
            ...(timelog.taskId !== undefined && { taskId: timelog.taskId }),
            ...(timelog.userId !== undefined && { userId: timelog.userId }),
            ...(timelog.hours !== undefined && { hours: timelog.hours }),
            ...(timelog.trackedDate !== undefined && { trackedDate: timelog.trackedDate }),
            ...(timelog.comment !== undefined && { comment: timelog.comment }),
            ...(timelog.categoryId !== undefined && { categoryId: timelog.categoryId }),
            ...(timelog.createdDate !== undefined && { createdDate: timelog.createdDate }),
            ...(timelog.updatedDate !== undefined && { updatedDate: timelog.updatedDate }),
            ...(timelog.billingType !== undefined && { billingType: timelog.billingType }),
            ...(timelog.approvalStatus !== undefined && { approvalStatus: timelog.approvalStatus }),
            ...(timelog.exportStatus !== undefined && { exportStatus: timelog.exportStatus }),
            ...(timelog.lockStatus !== undefined && { lockStatus: timelog.lockStatus }),
            ...(timelog.finance !== undefined && { finance: timelog.finance })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
