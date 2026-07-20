import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspaceId: z.string().optional().describe('Workspace ID to filter scorecards. Example: "7273476131570014205"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const QuestionOptionSchema = z
    .object({
        id: z.number().optional(),
        text: z.string().nullish()
    })
    .passthrough();

const QuestionSchema = z
    .object({
        questionId: z.string().nullish(),
        questionRevisionId: z.string().nullish(),
        questionText: z.string().nullish(),
        isOverall: z.boolean().nullish(),
        questionType: z.string().nullish(),
        answerGuide: z.string().nullish(),
        minRange: z.union([z.string(), z.number()]).nullish(),
        maxRange: z.union([z.string(), z.number()]).nullish(),
        answerOptions: z.array(QuestionOptionSchema).nullish()
    })
    .passthrough();

const ScorecardSchema = z
    .object({
        scorecardId: z.string().nullable(),
        scorecardName: z.string().nullish(),
        workspaceId: z.string().nullish(),
        enabled: z.boolean().nullish(),
        updaterUserId: z.string().nullish(),
        created: z.string().nullish(),
        updated: z.string().nullish(),
        reviewMethod: z.string().nullish(),
        questions: z.array(QuestionSchema).nullish()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        requestId: z.string().optional(),
        scorecards: z.array(ScorecardSchema).nullish(),
        records: z
            .object({
                totalRecords: z.number().nullish(),
                currentPageSize: z.number().nullish()
            })
            .nullish(),
        cursor: z.string().nullish()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ScorecardSchema).nullable(),
    nextCursor: z.string().nullish()
});

const action = createAction({
    description: 'List scorecards from Gong',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:settings:scorecards:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://help.gong.io/apidocs/retrieve-scorecards-details-v2settingsscorecards
            endpoint: '/v2/settings/scorecards',
            params: {
                ...(input.workspaceId !== undefined && { workspaceId: input.workspaceId }),
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const scorecards = providerResponse.scorecards ?? [];

        return {
            items: scorecards,
            ...(providerResponse.cursor !== undefined &&
                providerResponse.cursor !== null &&
                providerResponse.cursor !== '' && {
                    nextCursor: providerResponse.cursor
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
