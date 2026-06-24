import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fromDate: z.string().describe('The start date (inclusive) in YYYY-MM-DD format.'),
    toDate: z.string().describe('The end date (exclusive) in YYYY-MM-DD format. Must not exceed the current day.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    userIds: z.array(z.string()).optional().describe('Filter to specific Gong user IDs (up to 20 digits each).')
});

const DailyActivitySchema = z.object({
    callsAsHost: z.array(z.string()).nullish(),
    callsGaveFeedback: z.array(z.string()).nullish(),
    callsRequestedFeedback: z.array(z.string()).nullish(),
    callsReceivedFeedback: z.array(z.string()).nullish(),
    ownCallsListenedTo: z.array(z.string()).nullish(),
    othersCallsListenedTo: z.array(z.string()).nullish(),
    callsSharedInternally: z.array(z.string()).nullish(),
    callsSharedExternally: z.array(z.string()).nullish(),
    callsAttended: z.array(z.string()).nullish(),
    callsCommentsGiven: z.array(z.string()).nullish(),
    callsCommentsReceived: z.array(z.string()).nullish(),
    callsMarkedAsFeedbackGiven: z.array(z.string()).nullish(),
    callsMarkedAsFeedbackReceived: z.array(z.string()).nullish(),
    callsScorecardsFilled: z.array(z.string()).nullish(),
    callsScorecardsReceived: z.array(z.string()).nullish(),
    fromDate: z.string().nullish(),
    toDate: z.string().nullish()
});

const UserActivitySchema = z.object({
    userId: z.string(),
    userEmailAddress: z.string().nullish(),
    userDailyActivityStats: z.array(DailyActivitySchema).nullish()
});

const RecordsSchema = z.object({
    totalRecords: z.number().nullable(),
    currentPageSize: z.number().nullable(),
    currentPageNumber: z.number().nullable(),
    cursor: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    requestId: z.string(),
    records: RecordsSchema.nullable(),
    usersDetailedActivities: z.array(UserActivitySchema).nullable()
});

const OutputSchema = z.object({
    requestId: z.string(),
    records: RecordsSchema.nullable(),
    usersDetailedActivities: z.array(UserActivitySchema).nullable(),
    nextCursor: z.string().nullish()
});

const action = createAction({
    description: 'Retrieve daily activity statistics for applicable users over a date range.',
    version: '1.0.2',
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
            ...(parsed.records?.cursor !== undefined && { nextCursor: parsed.records.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
