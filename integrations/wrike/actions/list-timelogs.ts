import { z } from 'zod';
import { createAction } from 'nango';

const InstantRangeSchema = z.object({
    start: z.string().optional().describe('Range start as an ISO 8601 UTC instant, e.g. "2026-10-07T00:00:00Z".'),
    end: z.string().optional().describe('Range end as an ISO 8601 UTC instant, e.g. "2026-10-08T00:00:00Z".')
});

const LocalDateTimeRangeSchema = z.object({
    equal: z.string().optional().describe('Exact tracked date to match, in local time, e.g. "2026-10-07" or "2026-10-07T09:30:00".'),
    start: z.string().optional().describe('Tracked date range start, in local time, e.g. "2026-10-01" or "2026-10-01T00:00:00".'),
    end: z.string().optional().describe('Tracked date range end, in local time, e.g. "2026-10-08" or "2026-10-08T23:59:59".')
});

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination token (nextPageToken) returned by a previous call. Omit it to fetch the first page.'),
        pageSize: z
            .number()
            .int()
            .min(1)
            .max(1000)
            .optional()
            .describe('Number of timelogs to return per page (1-1000). When omitted, all matching timelogs are returned in one response.'),
        me: z.boolean().optional().describe('When true, only timelogs created by the current user are returned.'),
        createdDate: InstantRangeSchema.optional().describe('Filter by the timelog creation date, either an exact instant or a start/end range.'),
        updatedDate: InstantRangeSchema.optional().describe('Filter by the timelog last-updated date, either an exact instant or a start/end range.'),
        trackedDate: LocalDateTimeRangeSchema.optional().describe('Filter by the date the time was tracked for, either an exact date or a start/end range.'),
        billingTypes: z
            .array(z.enum(['Billable', 'NonBillable']))
            .optional()
            .describe('Only return timelogs with these billing types.'),
        fields: z
            .array(z.enum(['approvalStatus', 'lockStatus', 'exportStatus', 'billingType']))
            .optional()
            .describe('Optional fields to include on each returned timelog; omit to get the default field set.')
    })
    .describe('Filters and pagination options for listing Wrike timelogs.');

const TimelogSchema = z.object({
    id: z.string().describe('Unique timelog identifier.'),
    taskId: z.string().optional().describe('ID of the task the time was tracked against.'),
    userId: z.string().optional().describe('ID of the user who logged the time.'),
    categoryId: z.string().optional().describe('ID of the timelog category, when one is set.'),
    hours: z.number().optional().describe('Hours tracked in this entry, between 0 and 24.'),
    trackedDate: z.string().optional().describe('Date the time was tracked for, formatted "yyyy-MM-dd".'),
    createdDate: z.string().optional().describe('When the timelog was created, in ISO 8601 UTC.'),
    updatedDate: z.string().optional().describe('When the timelog was last updated, in ISO 8601 UTC.'),
    comment: z.string().optional().describe('Free-text comment attached to the timelog.'),
    billingType: z.enum(['Billable', 'NonBillable']).optional().describe('Billing type; only present when requested via the "fields" input.'),
    approvalStatus: z
        .enum(['Draft', 'NotSubmitted', 'Approved', 'Rejected', 'Cancelled', 'Pending'])
        .optional()
        .describe('Timesheet approval status; only present when requested via the "fields" input.'),
    lockStatus: z.enum(['Locked', 'Unlocked']).optional().describe('Lock status; only present when requested via the "fields" input.'),
    exportStatus: z
        .enum(['NotExported', 'Exported', 'ReadyForExport'])
        .optional()
        .describe('Export status; only present when requested via the "fields" input.'),
    finance: z
        .object({
            currency: z.string().optional().describe('Currency code used for the computed fees and costs.'),
            actualFees: z.number().optional().describe('Actual fees computed for the timelog.'),
            actualCost: z.number().optional().describe('Actual cost computed for the timelog.')
        })
        .optional()
        .describe('Financial details for the timelog, when available.')
});

const OutputSchema = z
    .object({
        timelogs: z.array(TimelogSchema).describe('Timelog entries matching the requested filters.'),
        nextPageToken: z
            .string()
            .optional()
            .describe('Token to pass as "cursor" on the next call to fetch the following page. Absent when the page returned no entries.')
    })
    .describe('A page of Wrike timelog entries and the token needed to fetch the next page.');

const ProviderTimelogsResponseSchema = z.object({
    kind: z.string().optional(),
    data: z.array(TimelogSchema).optional(),
    nextPageToken: z.string().optional(),
    responseSize: z.number().optional()
});

/**
 * @tags: [read]
 * @tagReason: Lists time-tracking entries from the provider and performs no mutation.
 * @pitfalls: The API may return a nextPageToken even when a page has zero timelogs, and such a token is not reusable; this action only returns a token when at least one timelog is returned, so stop paging once it is absent.
 */
const action = createAction({
    description: 'List time-tracking entries across the whole account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.cursor !== undefined) {
            params['nextPageToken'] = input.cursor;
        }
        if (input.pageSize !== undefined) {
            params['pageSize'] = input.pageSize;
        }
        if (input.me === true) {
            params['me'] = 'true';
        }
        if (input.createdDate !== undefined) {
            params['createdDate'] = JSON.stringify(input.createdDate);
        }
        if (input.updatedDate !== undefined) {
            params['updatedDate'] = JSON.stringify(input.updatedDate);
        }
        if (input.trackedDate !== undefined) {
            params['trackedDate'] = JSON.stringify(input.trackedDate);
        }
        if (input.billingTypes !== undefined) {
            params['billingTypes'] = JSON.stringify(input.billingTypes);
        }
        if (input.fields !== undefined) {
            params['fields'] = JSON.stringify(input.fields);
        }

        const response = await nango.get({
            // https://developers.wrike.com/api/v4/timelogs/
            endpoint: '/timelogs',
            params,
            retries: 3
        });

        const parsed = ProviderTimelogsResponseSchema.parse(response.data);
        const timelogs = parsed.data ?? [];
        const nextPageToken = parsed.nextPageToken;

        return {
            timelogs,
            ...(timelogs.length > 0 && nextPageToken != null && nextPageToken !== '' && { nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
