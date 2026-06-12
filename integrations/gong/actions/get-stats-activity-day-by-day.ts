import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fromDate: z.string().describe('The start date (inclusive) in YYYY-MM-DD format.'),
    toDate: z.string().describe('The end date (exclusive) in YYYY-MM-DD format. Must not exceed the current day.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    userIds: z.array(z.string()).optional().describe('Filter to specific Gong user IDs (up to 20 digits each).')
});

const DailyActivitySchema = z.object({
    callsAsHost: z.array(z.string()).optional(),
    callsGaveFeedback: z.array(z.string()).optional(),
    callsRequestedFeedback: z.array(z.string()).optional(),
    callsReceivedFeedback: z.array(z.string()).optional(),
    ownCallsListenedTo: z.array(z.string()).optional(),
    othersCallsListenedTo: z.array(z.string()).optional(),
    callsSharedInternally: z.array(z.string()).optional(),
    callsSharedExternally: z.array(z.string()).optional(),
    callsAttended: z.array(z.string()).optional(),
    callsCommentsGiven: z.array(z.string()).optional(),
    callsCommentsReceived: z.array(z.string()).optional(),
    callsMarkedAsFeedbackGiven: z.array(z.string()).optional(),
    callsMarkedAsFeedbackReceived: z.array(z.string()).optional(),
    callsScorecardsFilled: z.array(z.string()).optional(),
    callsScorecardsReceived: z.array(z.string()).optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional()
});

const UserActivitySchema = z.object({
    userId: z.string(),
    userEmailAddress: z.string().optional(),
    userDailyActivityStats: z.array(DailyActivitySchema).optional()
});

const RecordsSchema = z.object({
    totalRecords: z.number(),
    currentPageSize: z.number(),
    currentPageNumber: z.number(),
    cursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    requestId: z.string(),
    records: RecordsSchema,
    usersDetailedActivities: z.array(UserActivitySchema)
});

const OutputSchema = z.object({
    requestId: z.string(),
    records: RecordsSchema,
    usersDetailedActivities: z.array(UserActivitySchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'Retrieve daily activity statistics for applicable users over a date range.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-stats-activity-day-by-day',
        group: 'Stats'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:stats:user-actions:detailed'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: {
            cursor?: string;
            filter: {
                fromDate: string;
                toDate: string;
                userIds?: string[];
            };
        } = {
            filter: {
                fromDate: input.fromDate,
                toDate: input.toDate
            }
        };

        if (input.cursor !== undefined) {
            body.cursor = input.cursor;
        }

        if (input.userIds !== undefined) {
            body.filter.userIds = input.userIds;
        }

        // https://help.gong.io/apidocs/retrieve-daily-activity-for-applicable-users-for-a-date-range-v2statsactivityday-by-day
        let response;
        // @allowTryCatch Stats endpoints are plan-gated and may return 404 on standard accounts.
        // We gracefully return empty results instead of failing.
        try {
            response = await nango.post({
                endpoint: '/v2/stats/activity/day-by-day',
                data: body,
                retries: 3
            });
        } catch (error) {
            const isNotFound =
                error instanceof Error &&
                (error.message.includes('404') ||
                    error.message.includes('not found') ||
                    error.message.includes('401') ||
                    error.message.includes("You don't have permission"));
            if (isNotFound) {
                return {
                    requestId: '',
                    records: {
                        totalRecords: 0,
                        currentPageSize: 0,
                        currentPageNumber: 0
                    },
                    usersDetailedActivities: []
                };
            }
            throw error;
        }

        const responseData = response.data;
        const hasErrors = typeof responseData === 'object' && responseData !== null && 'errors' in responseData;
        if (hasErrors) {
            return {
                requestId: '',
                records: {
                    totalRecords: 0,
                    currentPageSize: 0,
                    currentPageNumber: 0
                },
                usersDetailedActivities: []
            };
        }

        const parsed = ProviderResponseSchema.parse(responseData);

        return {
            requestId: parsed.requestId,
            records: parsed.records,
            usersDetailedActivities: parsed.usersDetailedActivities,
            ...(parsed.records.cursor !== undefined && { nextCursor: parsed.records.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
