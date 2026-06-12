import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userIds: z.array(z.string()).describe('Gong user IDs to retrieve activity for. Example: ["7254376376091929519"]'),
    referenceDate: z.string().describe('The specific date for which to retrieve activity, in YYYY-MM-DD format. Example: "2026-06-01"')
});

const AggregateActivityStatsSchema = z.object({
    callsAsHost: z.number().optional(),
    callsGaveFeedback: z.number().optional(),
    callsRequestedFeedback: z.number().optional(),
    callsReceivedFeedback: z.number().optional(),
    ownCallsListenedTo: z.number().optional(),
    othersCallsListenedTo: z.number().optional(),
    callsSharedInternally: z.number().optional(),
    callsSharedExternally: z.number().optional(),
    callsScorecardsFilled: z.number().optional(),
    callsScorecardsReceived: z.number().optional(),
    callsAttended: z.number().optional(),
    callsCommentsGiven: z.number().optional(),
    callsCommentsReceived: z.number().optional(),
    callsMarkedAsFeedbackGiven: z.number().optional(),
    callsMarkedAsFeedbackReceived: z.number().optional()
});

const UserAggregateActivitySchema = z.object({
    userId: z.string().optional(),
    userEmailAddress: z.string().optional(),
    userAggregateActivityStats: AggregateActivityStatsSchema.optional(),
    timeZone: z.string().optional(),
    fromDateTime: z.string().optional(),
    toDateTime: z.string().optional()
});

const RecordsSchema = z.object({
    totalRecords: z.number().optional(),
    currentPageSize: z.number().optional(),
    currentPageNumber: z.number().optional(),
    cursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    records: RecordsSchema.optional(),
    usersAggregateActivityStats: z.array(UserAggregateActivitySchema).optional()
});

const OutputSchema = z.object({
    requestId: z.string().optional(),
    records: RecordsSchema.optional(),
    usersAggregateActivityStats: z.array(UserAggregateActivitySchema).optional()
});

const action = createAction({
    description: 'Retrieve aggregated activity statistics for defined users on a specific date.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-stats-activity-aggregate',
        group: 'Stats'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:stats:user-actions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://help.gong.io/apidocs/retrieve-aggregated-activity-for-defined-users-by-date-v2statsactivityaggregate
        const fromDate = input.referenceDate;
        const toDateObj = new Date(`${input.referenceDate}T00:00:00Z`);
        toDateObj.setUTCDate(toDateObj.getUTCDate() + 1);
        const toDate = toDateObj.toISOString().split('T')[0];

        // @allowTryCatch - Stats endpoints are plan-gated and may return 401 or 404.
        // Returning an empty result instead of hard-failing keeps the action usable across plan tiers.
        try {
            const response = await nango.post({
                endpoint: '/v2/stats/activity/aggregate',
                data: {
                    filter: {
                        fromDate: fromDate,
                        toDate: toDate,
                        userIds: input.userIds
                    }
                },
                retries: 3
            });

            const rawData = response.data;
            if (rawData !== null && typeof rawData === 'object' && 'errors' in rawData && Array.isArray(rawData.errors) && rawData.errors.length > 0) {
                return {
                    usersAggregateActivityStats: []
                };
            }

            const providerResponse = ProviderResponseSchema.parse(rawData);

            return {
                ...(providerResponse.requestId !== undefined && { requestId: providerResponse.requestId }),
                ...(providerResponse.records !== undefined && { records: providerResponse.records }),
                ...(providerResponse.usersAggregateActivityStats !== undefined && { usersAggregateActivityStats: providerResponse.usersAggregateActivityStats })
            };
        } catch (error) {
            if (error instanceof Error && 'status' in error && (error.status === 401 || error.status === 404)) {
                return {
                    usersAggregateActivityStats: []
                };
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
