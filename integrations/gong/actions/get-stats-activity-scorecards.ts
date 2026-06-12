import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fromDateTime: z.string().describe('Start of the date range in ISO 8601 format. Example: 2026-01-01T00:00:00Z'),
    toDateTime: z.string().describe('End of the date range in ISO 8601 format. Example: 2026-06-01T00:00:00Z'),
    scorecardIds: z.array(z.string()).optional().describe('Optional list of scorecard IDs to filter by.'),
    userIds: z.array(z.string()).optional().describe('Optional list of user IDs of reviewed team members to filter by.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response.')
});

const AnswerSchema = z.object({
    questionId: z.number(),
    questionRevisionId: z.number().optional(),
    isOverall: z.boolean().optional(),
    score: z.number().optional(),
    answerText: z.string().optional(),
    notApplicable: z.boolean().optional(),
    selectedOptions: z.array(z.string()).optional()
});

const AnsweredScorecardSchema = z.object({
    answeredScorecardId: z.number(),
    scorecardId: z.number(),
    scorecardName: z.string(),
    callId: z.number(),
    callStartTime: z.string().optional(),
    reviewedUserId: z.number().optional(),
    reviewerUserId: z.number().nullable().optional(),
    reviewMethod: z.string().optional(),
    editorUserId: z.number().nullable().optional(),
    reviewTime: z.string().optional(),
    visibilityType: z.string().optional(),
    answers: z.array(AnswerSchema).optional()
});

const RecordsSchema = z.object({
    totalRecords: z.number().optional(),
    currentPageSize: z.number().optional(),
    currentPageNumber: z.number().optional(),
    cursor: z.string().optional()
});

const ResponseSchema = z.object({
    requestId: z.string().optional(),
    records: RecordsSchema.optional(),
    answeredScorecards: z.array(AnsweredScorecardSchema).optional()
});

const OutputSchema = z.object({
    answeredScorecards: z.array(AnsweredScorecardSchema).optional(),
    cursor: z.string().optional()
});

const action = createAction({
    description: 'Retrieve answered scorecard statistics for reviewed users or specific scorecards over a date range.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-stats-activity-scorecards',
        group: 'Stats'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:stats:scorecards'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const toDate = (iso: string) => iso.slice(0, 10);

        const data = {
            ...(input.cursor && { cursor: input.cursor }),
            filter: {
                callFromDate: toDate(input.fromDateTime),
                callToDate: toDate(input.toDateTime),
                reviewFromDate: toDate(input.fromDateTime),
                reviewToDate: toDate(input.toDateTime),
                ...(input.scorecardIds && input.scorecardIds.length > 0 && { scorecardIds: input.scorecardIds }),
                ...(input.userIds && input.userIds.length > 0 && { reviewedUserIds: input.userIds })
            }
        };

        // @allowTryCatch: The Gong stats endpoint returns 404/401 when the feature is unavailable or the scope is missing.
        // We treat this as a valid empty result rather than a hard failure.
        try {
            // https://help.gong.io/apidocs/retrieve-answered-scorecards-for-applicable-reviewed-users-or-scorecards-for-a-date-range-v2statsactivityscorecards
            const response = await nango.post({
                endpoint: '/v2/stats/activity/scorecards',
                data,
                retries: 3
            });

            if (response.status === 404 || response.status === 401) {
                return {
                    answeredScorecards: []
                };
            }

            const parsed = ResponseSchema.parse(response.data);
            const records = parsed.records || {};

            return {
                answeredScorecards: parsed.answeredScorecards || [],
                ...(records.cursor != null && { cursor: records.cursor })
            };
        } catch (error) {
            if (error && typeof error === 'object' && 'status' in error && (error.status === 404 || error.status === 401)) {
                return {
                    answeredScorecards: []
                };
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
