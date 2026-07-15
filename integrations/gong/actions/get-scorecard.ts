import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    scorecardId: z.string().describe('The identifier of the scorecard. Example: "9067931441193858457"')
});

const QuestionOptionSchema = z.object({
    id: z.number().int(),
    text: z.string().nullable()
});

const QuestionSchema = z.object({
    questionId: z.string(),
    questionRevisionId: z.string().nullish(),
    questionText: z.string().nullish(),
    isOverall: z.boolean().nullish(),
    questionType: z.string().nullish(),
    answerGuide: z.string().nullish(),
    minRange: z.string().nullish(),
    maxRange: z.string().nullish(),
    answerOptions: z.array(QuestionOptionSchema).nullish()
});

const ScorecardSchema = z.object({
    scorecardId: z.string(),
    scorecardName: z.string().nullish(),
    workspaceId: z.string().nullish(),
    enabled: z.boolean().nullish(),
    updaterUserId: z.string().nullish(),
    created: z.string().nullish(),
    updated: z.string().nullish(),
    reviewMethod: z.string().nullish(),
    questions: z.array(QuestionSchema).nullish()
});

const ListResponseSchema = z.object({
    requestId: z.string().optional(),
    scorecards: z.array(ScorecardSchema).nullish()
});

const OutputSchema = ScorecardSchema;

const action = createAction({
    description: 'Retrieve a single scorecard from Gong.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:settings:scorecards:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://help.gong.io/apidocs/retrieve-scorecards-details-v2settingsscorecards
            endpoint: '/v2/settings/scorecards',
            retries: 3
        });

        const parsed = ListResponseSchema.parse(response.data);
        const scorecard = parsed.scorecards?.find((s) => s.scorecardId === input.scorecardId);

        if (!scorecard) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Scorecard with ID ${input.scorecardId} not found.`
            });
        }

        return scorecard;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
