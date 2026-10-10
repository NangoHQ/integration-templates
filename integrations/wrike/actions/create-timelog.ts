import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        taskId: z.string().describe('ID of the task to log time against. Example: "MAAAAAEQ_HoO"'),
        hours: z.number().min(0).max(24).describe('Hours worked to log, fractional values allowed. Must be within [0, 24]. Example: 1.5'),
        trackedDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .describe('Date the time was worked, in YYYY-MM-DD format. Example: "2026-10-09"'),
        comment: z.string().describe('Comment describing the work performed. Example: "Worked on sprint planning"')
    })
    .describe('Input for logging a time entry against a Wrike task.');

const ProviderTimelogSchema = z.object({
    id: z.string(),
    taskId: z.string(),
    userId: z.string(),
    hours: z.number(),
    createdDate: z.string(),
    updatedDate: z.string(),
    trackedDate: z.string(),
    comment: z.string().optional()
});

const ProviderResponseSchema = z.object({
    kind: z.string(),
    data: z.array(ProviderTimelogSchema)
});

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the created timelog record. Example: "IEAG5DAKIMCT73WX"'),
        taskId: z.string().describe('ID of the task the time was logged against. Example: "MAAAAAEQ_HoO"'),
        userId: z.string().describe('ID of the user the time entry belongs to. Example: "KUAZR5CO"'),
        hours: z.number().describe('Hours logged in the entry. Example: 1.5'),
        trackedDate: z.string().describe('Date the time was recorded for, in YYYY-MM-DD format. Example: "2026-10-09"'),
        createdDate: z.string().describe('Timestamp when the timelog was created, in ISO 8601 format. Example: "2026-10-09T12:00:00Z"'),
        updatedDate: z.string().describe('Timestamp when the timelog was last updated, in ISO 8601 format. Example: "2026-10-09T12:00:00Z"'),
        comment: z.string().optional().describe('Comment recorded on the timelog entry. Example: "Worked on sprint planning"')
    })
    .describe('The timelog entry created by the provider.');

/**
 * @tags: [write]
 * @tagReason: Creates a new time-tracking entry on a task via the provider.
 * @pitfalls: The entry is always attributed to the connection's own user, since logging time on behalf of another user is not supported, and timelogs are permanently deleted with no recycle bin, so they cannot be recovered.
 */
const action = createAction({
    description: 'Log a time entry (hours worked) against a task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.wrike.com/reference/posttaskssingletimelogs
            endpoint: `/tasks/${encodeURIComponent(input.taskId)}/timelogs`,
            data: {
                hours: input.hours,
                trackedDate: input.trackedDate,
                comment: input.comment
            },
            // Creating a timelog is not idempotent: a retried request would log the time twice.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const timelog = parsed.data[0];

        if (!timelog) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'The provider did not return a timelog after creation.'
            });
        }

        return {
            id: timelog.id,
            taskId: timelog.taskId,
            userId: timelog.userId,
            hours: timelog.hours,
            trackedDate: timelog.trackedDate,
            createdDate: timelog.createdDate,
            updatedDate: timelog.updatedDate,
            ...(timelog.comment != null && { comment: timelog.comment })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
