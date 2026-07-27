import { z } from 'zod';
import { createAction } from 'nango';

const ScoreCardQuestionSchema = z.object({
    id: z.string().or(z.number()),
    body: z.string().optional(),
    score: z.string().optional(),
    note: z.string().optional()
});

const ScoreCardTraitSchema = z.object({
    id: z.string().or(z.number()),
    name: z.string().optional(),
    score: z.string().optional(),
    note: z.string().optional(),
    questions: z.array(ScoreCardQuestionSchema)
});

const ScoreCardSectionSchema = z.object({
    id: z.string().or(z.number()),
    name: z.string().optional(),
    traits: z.array(ScoreCardTraitSchema)
});

const ScoreCardSchema = z.object({
    settings: z
        .object({
            questions_rateable: z.boolean().optional()
        })
        .optional(),
    sections: z.array(ScoreCardSectionSchema)
});

const InputSchema = z.object({
    id: z.string().describe('Candidate ID. Example: "272737d8"'),
    member_id: z.string().describe('Member ID adding the rating. Example: "1f395d"'),
    comment: z.string(),
    scale: z.enum(['thumbs', 'stars', 'numbers']).optional(),
    grade: z.number().int(),
    score_card: ScoreCardSchema.optional()
});

const ProviderRatingSchema = z
    .object({
        id: z.string().optional(),
        member_id: z.string().optional(),
        comment: z.string().optional(),
        scale: z.string().optional(),
        grade: z.number().optional(),
        score_card: z.object({}).passthrough().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string().optional(),
    member_id: z.string().optional(),
    comment: z.string().optional(),
    scale: z.string().optional(),
    grade: z.number().optional(),
    score_card: z.object({}).passthrough().optional()
});

const action = createAction({
    description: 'Add a new rating/evaluation for a candidate at their current stage.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_candidates'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: {
            member_id: string;
            comment: string;
            grade: number;
            scale?: string;
            score_card?: unknown;
        } = {
            member_id: input.member_id,
            comment: input.comment,
            grade: input.grade
        };

        if (input.scale !== undefined) {
            body.scale = input.scale;
        }

        if (input.score_card !== undefined) {
            body.score_card = input.score_card;
        }

        const response = await nango.post({
            // https://workable.readme.io/reference/rate-candidate
            endpoint: `/spi/v3/candidates/${encodeURIComponent(input.id)}/ratings`,
            data: body,
            retries: 3
        });

        const rawData: unknown = response.data;
        const providerRating = rawData !== null && typeof rawData === 'object' ? ProviderRatingSchema.parse(rawData) : {};

        return {
            ...(providerRating.id !== undefined && { id: providerRating.id }),
            member_id: providerRating.member_id !== undefined ? providerRating.member_id : input.member_id,
            comment: providerRating.comment !== undefined ? providerRating.comment : input.comment,
            scale: providerRating.scale !== undefined ? providerRating.scale : input.scale,
            grade: providerRating.grade !== undefined ? providerRating.grade : input.grade,
            ...(providerRating.score_card !== undefined && { score_card: providerRating.score_card })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
