import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fromDateTime: z.string().describe('Start of the date range in ISO 8601 format. Example: 2026-01-01T00:00:00Z'),
    toDateTime: z.string().describe('End of the date range in ISO 8601 format. Example: 2026-06-01T00:00:00Z'),
    scorecardIds: z.array(z.string()).optional().describe('Optional list of scorecard IDs to filter by.'),
    userIds: z.array(z.string()).optional().describe('Optional list of user IDs of reviewed team members to filter by.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response.')
});

const ProviderAnswerSchema = z.object({
    questionId: z.union([z.string(), z.number()]).transform(String).nullable(),
    questionRevisionId: z.union([z.string(), z.number()]).transform(String).nullish(),
    isOverall: z.boolean().nullish(),
    score: z.number().nullish(),
    answerText: z.string().nullish(),
    notApplicable: z.boolean().nullish(),
    selectedOptions: z.array(z.string()).nullish()
});

const ProviderAnsweredScorecardSchema = z.object({
    answeredScorecardId: z.union([z.string(), z.number()]).transform(String).nullable(),
    scorecardId: z.union([z.string(), z.number()]).transform(String).nullable(),
    scorecardName: z.string().nullable(),
    callId: z.union([z.string(), z.number()]).transform(String).nullable(),
    callStartTime: z.string().nullish(),
    reviewedUserId: z.union([z.string(), z.number()]).transform(String).nullish(),
    reviewerUserId: z.union([z.string(), z.number()]).transform(String).nullish(),
    reviewMethod: z.string().nullish(),
    editorUserId: z.union([z.string(), z.number()]).transform(String).nullish(),
    reviewTime: z.string().nullish(),
    visibilityType: z.string().nullish(),
    answers: z.array(ProviderAnswerSchema).nullish()
});

const OutputAnswerSchema = z.object({
    questionId: z.string().nullable(),
    questionRevisionId: z.string().nullish(),
    isOverall: z.boolean().nullish(),
    score: z.number().nullish(),
    answerText: z.string().nullish(),
    notApplicable: z.boolean().nullish(),
    selectedOptions: z.array(z.string()).nullish()
});

const OutputAnsweredScorecardSchema = z.object({
    answeredScorecardId: z.string().nullable(),
    scorecardId: z.string().nullable(),
    scorecardName: z.string().nullable(),
    callId: z.string().nullable(),
    callStartTime: z.string().nullish(),
    reviewedUserId: z.string().nullish(),
    reviewerUserId: z.string().nullish(),
    reviewMethod: z.string().nullish(),
    editorUserId: z.string().nullish(),
    reviewTime: z.string().nullish(),
    visibilityType: z.string().nullish(),
    answers: z.array(OutputAnswerSchema).nullish()
});

const RecordsSchema = z.object({
    totalRecords: z.number().nullish(),
    currentPageSize: z.number().nullish(),
    currentPageNumber: z.number().nullish(),
    cursor: z.string().nullish()
});

const ResponseSchema = z.object({
    requestId: z.string().optional(),
    records: RecordsSchema.nullish(),
    answeredScorecards: z.array(ProviderAnsweredScorecardSchema).nullish()
});

const OutputSchema = z.object({
    answeredScorecards: z.array(OutputAnsweredScorecardSchema).nullish(),
    cursor: z.string().nullish()
});

const action = createAction({
    description: 'Retrieve answered scorecard statistics for reviewed users or specific scorecards over a date range.',
    version: '1.0.2',
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
