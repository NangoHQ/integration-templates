import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspaceId: z.string().optional().describe('Workspace ID to filter scorecards. Example: "7273476131570014205"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const QuestionOptionSchema = z
    .object({
        id: z.number().optional(),
        text: z.string().optional()
    })
    .passthrough();

const QuestionSchema = z
    .object({
        questionId: z.string().optional(),
        questionRevisionId: z.string().optional(),
        questionText: z.string().optional(),
        isOverall: z.boolean().optional(),
        questionType: z.string().optional(),
        answerGuide: z.string().nullable().optional(),
        minRange: z.union([z.string(), z.number()]).nullable().optional(),
        maxRange: z.union([z.string(), z.number()]).nullable().optional(),
        answerOptions: z.array(QuestionOptionSchema).nullable().optional()
    })
    .passthrough();

const ScorecardSchema = z
    .object({
        scorecardId: z.string(),
        scorecardName: z.string().optional(),
        workspaceId: z.string().optional(),
        enabled: z.boolean().optional(),
        updaterUserId: z.string().optional(),
        created: z.string().optional(),
        updated: z.string().optional(),
        reviewMethod: z.string().optional(),
        questions: z.array(QuestionSchema).optional()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        requestId: z.string().optional(),
        scorecards: z.array(ScorecardSchema).optional(),
        records: z
            .object({
                totalRecords: z.number().optional(),
                currentPageSize: z.number().optional()
            })
            .optional(),
        cursor: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ScorecardSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List scorecards from Gong',
    version: '1.0.1',
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
