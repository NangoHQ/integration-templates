import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    scorecardId: z.string().describe('The identifier of the scorecard. Example: "9067931441193858457"')
});

const QuestionOptionSchema = z.object({
    id: z.number().int(),
    text: z.string()
});

const QuestionSchema = z.object({
    questionId: z.string(),
    questionRevisionId: z.string().optional(),
    questionText: z.string().optional(),
    isOverall: z.boolean().optional(),
    questionType: z.string().optional(),
    answerGuide: z.string().nullable().optional(),
    minRange: z.string().nullable().optional(),
    maxRange: z.string().nullable().optional(),
    answerOptions: z.array(QuestionOptionSchema).nullable().optional()
});

const ScorecardSchema = z.object({
    scorecardId: z.string(),
    scorecardName: z.string().optional(),
    workspaceId: z.string().optional(),
    enabled: z.boolean().optional(),
    updaterUserId: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    reviewMethod: z.string().optional(),
    questions: z.array(QuestionSchema).optional()
});

const ListResponseSchema = z.object({
    requestId: z.string().optional(),
    scorecards: z.array(ScorecardSchema).optional()
});

const OutputSchema = ScorecardSchema;

const action = createAction({
    description: 'Retrieve a single scorecard from Gong.',
    version: '1.0.1',
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
