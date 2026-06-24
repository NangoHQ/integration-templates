import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userIds: z.array(z.string()).optional().describe('Gong user IDs to filter by. Example: ["7254376376091929519"]'),
    fromDateTime: z.string().describe('Start date in ISO 8601 format. Example: "2026-01-01T00:00:00Z"'),
    toDateTime: z.string().describe('End date in ISO 8601 format. Example: "2026-01-31T00:00:00Z"'),
    groupingPeriod: z
        .enum(['day', 'week', 'month', 'quarter', 'year', 'DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'])
        .describe('Time period for grouping. Example: "week"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const AggregateActivityWithDatesSchema = z
    .object({
        callsAsHost: z.number().nullish(),
        callsAttended: z.number().nullish(),
        callsCommentsGiven: z.number().nullish(),
        callsCommentsReceived: z.number().nullish(),
        callsGaveFeedback: z.number().nullish(),
        callsMarkedAsFeedbackGiven: z.number().nullish(),
        callsMarkedAsFeedbackReceived: z.number().nullish(),
        callsReceivedFeedback: z.number().nullish(),
        callsRequestedFeedback: z.number().nullish(),
        callsScorecardsFilled: z.number().nullish(),
        callsScorecardsReceived: z.number().nullish(),
        callsSharedExternally: z.number().nullish(),
        callsSharedInternally: z.number().nullish(),
        fromDate: z.string().nullish(),
        othersCallsListenedTo: z.number().nullish(),
        ownCallsListenedTo: z.number().nullish(),
        toDate: z.string().nullish()
    })
    .passthrough();

const UserAggregateByPeriodActivitiesSchema = z
    .object({
        userAggregateActivity: z.array(AggregateActivityWithDatesSchema).nullish(),
        userEmailAddress: z.string().nullish(),
        userId: z.string().nullish()
    })
    .passthrough();

const RecordsSchema = z
    .object({
        currentPageNumber: z.number().nullish(),
        currentPageSize: z.number().nullish(),
        cursor: z.string().nullish(),
        totalRecords: z.number().nullish()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        requestId: z.string().optional(),
        records: RecordsSchema.nullish(),
        usersAggregateActivity: z.array(UserAggregateByPeriodActivitiesSchema).nullish()
    })
    .passthrough();

const OutputSchema = z.object({
    requestId: z.string().optional(),
    records: z
        .object({
            totalRecords: z.number().nullish(),
            currentPageSize: z.number().nullish(),
            cursor: z.string().nullish()
        })
        .nullish(),
    usersAggregateActivity: z
        .array(
            z
                .object({
                    userId: z.string().nullish(),
                    userEmailAddress: z.string().nullish(),
                    userAggregateActivity: z
                        .array(
                            z
                                .object({
                                    fromDate: z.string().nullish(),
                                    toDate: z.string().nullish(),
                                    callsAsHost: z.number().nullish(),
                                    callsAttended: z.number().nullish(),
                                    callsCommentsGiven: z.number().nullish(),
                                    callsCommentsReceived: z.number().nullish(),
                                    callsGaveFeedback: z.number().nullish(),
                                    callsMarkedAsFeedbackGiven: z.number().nullish(),
                                    callsMarkedAsFeedbackReceived: z.number().nullish(),
                                    callsReceivedFeedback: z.number().nullish(),
                                    callsRequestedFeedback: z.number().nullish(),
                                    callsScorecardsFilled: z.number().nullish(),
                                    callsScorecardsReceived: z.number().nullish(),
                                    callsSharedExternally: z.number().nullish(),
                                    callsSharedInternally: z.number().nullish(),
                                    othersCallsListenedTo: z.number().nullish(),
                                    ownCallsListenedTo: z.number().nullish()
                                })
                                .passthrough()
                        )
                        .nullish()
                })
                .passthrough()
        )
        .nullish()
});

const action = createAction({
    description: 'Retrieve aggregated activity statistics for users over a date range, grouped by time period.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:stats:user-actions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const filter: Record<string, unknown> = {
            fromDate: input.fromDateTime.slice(0, 10),
            toDate: input.toDateTime.slice(0, 10)
        };

        if (input.userIds !== undefined && input.userIds.length > 0) {
            filter['userIds'] = input.userIds;
        }

        const body: Record<string, unknown> = {
            aggregationPeriod: input.groupingPeriod.toUpperCase(),
            filter: filter
        };

        if (input.cursor !== undefined) {
            body['cursor'] = input.cursor;
        }

        let response;
        // @allowTryCatch The Gong stats endpoints are plan-gated and may return 401 or 404.
        // We catch the HTTP error to return a graceful empty response instead of hard-failing.
        try {
            // https://help.gong.io/docs/what-the-gong-api-provides
            response = await nango.post({
                endpoint: '/v2/stats/activity/aggregate-by-period',
                data: body,
                retries: 3
            });
        } catch (error: unknown) {
            const HttpErrorSchema = z.object({
                status: z.number().optional()
            });
            const parsedError = HttpErrorSchema.safeParse(error);
            if (parsedError.success && (parsedError.data.status === 404 || parsedError.data.status === 401)) {
                return {
                    requestId: undefined,
                    records: undefined,
                    usersAggregateActivity: []
                };
            }
            throw error;
        }

        if (response.status === 404 || response.status === 401 || (response.data && typeof response.data === 'object' && 'errors' in response.data)) {
            return {
                requestId: undefined,
                records: undefined,
                usersAggregateActivity: []
            };
        }

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse provider response',
                details: providerResponse.error.message
            });
        }

        const data = providerResponse.data;

        return {
            ...(data.requestId !== undefined && { requestId: data.requestId }),
            ...(data.records != null && {
                records: {
                    ...(data.records.totalRecords !== undefined && { totalRecords: data.records.totalRecords }),
                    ...(data.records.currentPageSize !== undefined && { currentPageSize: data.records.currentPageSize }),
                    ...(data.records.cursor !== undefined && { cursor: data.records.cursor })
                }
            }),
            ...(data.usersAggregateActivity != null && {
                usersAggregateActivity: data.usersAggregateActivity.map((user) => ({
                    ...(user.userId !== undefined && { userId: user.userId }),
                    ...(user.userEmailAddress !== undefined && { userEmailAddress: user.userEmailAddress }),
                    ...(user.userAggregateActivity != null && {
                        userAggregateActivity: user.userAggregateActivity.map((activity) => ({
                            ...(activity.fromDate !== undefined && { fromDate: activity.fromDate }),
                            ...(activity.toDate !== undefined && { toDate: activity.toDate }),
                            ...(activity.callsAsHost !== undefined && { callsAsHost: activity.callsAsHost }),
                            ...(activity.callsAttended !== undefined && { callsAttended: activity.callsAttended }),
                            ...(activity.callsCommentsGiven !== undefined && { callsCommentsGiven: activity.callsCommentsGiven }),
                            ...(activity.callsCommentsReceived !== undefined && { callsCommentsReceived: activity.callsCommentsReceived }),
                            ...(activity.callsGaveFeedback !== undefined && { callsGaveFeedback: activity.callsGaveFeedback }),
                            ...(activity.callsMarkedAsFeedbackGiven !== undefined && { callsMarkedAsFeedbackGiven: activity.callsMarkedAsFeedbackGiven }),
                            ...(activity.callsMarkedAsFeedbackReceived !== undefined && {
                                callsMarkedAsFeedbackReceived: activity.callsMarkedAsFeedbackReceived
                            }),
                            ...(activity.callsReceivedFeedback !== undefined && { callsReceivedFeedback: activity.callsReceivedFeedback }),
                            ...(activity.callsRequestedFeedback !== undefined && { callsRequestedFeedback: activity.callsRequestedFeedback }),
                            ...(activity.callsScorecardsFilled !== undefined && { callsScorecardsFilled: activity.callsScorecardsFilled }),
                            ...(activity.callsScorecardsReceived !== undefined && { callsScorecardsReceived: activity.callsScorecardsReceived }),
                            ...(activity.callsSharedExternally !== undefined && { callsSharedExternally: activity.callsSharedExternally }),
                            ...(activity.callsSharedInternally !== undefined && { callsSharedInternally: activity.callsSharedInternally }),
                            ...(activity.othersCallsListenedTo !== undefined && { othersCallsListenedTo: activity.othersCallsListenedTo }),
                            ...(activity.ownCallsListenedTo !== undefined && { ownCallsListenedTo: activity.ownCallsListenedTo })
                        }))
                    })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
